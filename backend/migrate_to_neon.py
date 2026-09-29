"""Copy local SQLite data to an empty Neon database, without publishing the data."""

import os
import argparse
from getpass import getpass
from pathlib import Path

from sqlalchemy import create_engine, func, inspect, select, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.exc import SQLAlchemyError

from app import models  # Register every table.
from app.database import Base


def diagnose(target: Engine) -> None:
    """Print counts only; never print credentials or modify the destination."""
    with target.connect() as connection:
        available = set(inspect(connection).get_table_names())
        for table in Base.metadata.sorted_tables:
            if table.name not in available:
                print(f'{table.name} : table absente')
            else:
                count = connection.scalar(select(func.count()).select_from(table))
                print(f'{table.name} : {count} lignes')


def migrate(source: Engine, target: Engine) -> dict[str, int]:
    tables = Base.metadata.sorted_tables
    # Read a consistent snapshot before opening the destination transaction.
    with source.connect() as connection:
        connection.exec_driver_sql("BEGIN")
        snapshot = {
            table.name: [dict(row) for row in connection.execute(select(table)).mappings()]
            for table in tables
        }
    if not snapshot['coffret'] or not snapshot['pige']:
        raise ValueError("La base locale ne contient aucun catalogue a transferer.")

    Base.metadata.create_all(target)
    counts = {}
    with target.begin() as connection:
        if target.dialect.name == 'postgresql':
            names = ', '.join('"' + table.name + '"' for table in tables)
            connection.execute(text(f'LOCK TABLE {names} IN ACCESS EXCLUSIVE MODE'))
        occupied = {
            table.name: connection.scalar(select(func.count()).select_from(table))
            for table in tables if table.name != 'utilisateur'
        }
        if any(occupied.values()):
            details = ', '.join(f'{name}={count}' for name, count in occupied.items())
            raise ValueError(f"La base cible contient deja des donnees ({details}) : transfert annule sans modification.")

        # A first visit may already have created a user on Render. Preserve it.
        users = Base.metadata.tables['utilisateur']
        existing = list(connection.execute(select(users)).mappings())
        by_name = {row['nom'].strip().casefold(): row['id'] for row in existing}
        next_id = max((row['id'] for row in existing), default=0) + 1
        user_ids = {}
        inserted = 0
        for row in snapshot['utilisateur']:
            key = row['nom'].strip().casefold()
            if key not in by_name:
                connection.execute(users.insert().values(**{**row, 'id': next_id}))
                by_name[key] = next_id
                next_id += 1
                inserted += 1
            user_ids[row['id']] = by_name[key]
        counts['utilisateur'] = inserted

        for table in tables:
            if table.name == 'utilisateur':
                continue
            rows = snapshot[table.name]
            for row in rows:
                if row.get('utilisateur_id') is not None:
                    row['utilisateur_id'] = user_ids[row['utilisateur_id']]
            if rows:
                connection.execute(table.insert(), rows)
            counts[table.name] = len(rows)

        # Explicit IDs must also advance PostgreSQL's auto-increment sequences.
        if target.dialect.name == 'postgresql':
            for table in tables:
                maximum = connection.scalar(select(func.max(table.c.id)))
                if maximum is not None:
                    connection.execute(
                        text("SELECT setval(pg_get_serial_sequence(:table_name, 'id'), :maximum, true)"),
                        {'table_name': table.name, 'maximum': maximum},
                    )
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description='Transfert SQLite vers Neon ou diagnostic en lecture seule.')
    parser.add_argument('--check', action='store_true', help='Afficher les nombres de lignes sans modifier la base.')
    args = parser.parse_args()
    raw_url = os.environ.get('NEON_DATABASE_URL') or getpass('Colle l URL Neon (saisie masquee), puis Entree : ')
    url = make_url(raw_url.strip())
    if url.get_backend_name() not in ('postgres', 'postgresql'):
        raise ValueError('La destination doit etre une URL PostgreSQL Neon.')
    url = url.set(drivername='postgresql+psycopg')
    source_path = Path(__file__).resolve().parent / 'pigecontrol.db'
    if not source_path.is_file():
        raise ValueError('Base SQLite locale introuvable.')
    source = create_engine(f'sqlite:///file:{source_path.as_posix()}?mode=ro&uri=true')
    target = create_engine(url, connect_args={'connect_timeout': 20}, pool_pre_ping=True)
    try:
        if args.check:
            diagnose(target)
            return
        counts = migrate(source, target)
        for table, count in counts.items():
            print(f'{table} : {count} lignes ajoutees')
        print('Transfert termine. Recharge le site Render.')
    finally:
        source.dispose()
        target.dispose()


if __name__ == '__main__':
    try:
        main()
    except (ValueError, SQLAlchemyError) as error:
        # Connection exceptions can include credentials or private row data.
        print(str(error) if isinstance(error, ValueError) else
              'Echec du transfert. Verifie l URL Neon, la connexion et les droits de la base. Aucune donnee existante n est effacee.')
        raise SystemExit(1)
