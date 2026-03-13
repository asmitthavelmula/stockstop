import os
import django
import sqlite3

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from portfolios.models import Portfolio, Stock

def resequence():
    # 1. Delete portfolios with specific IDs
    ids_to_delete = [15, 14, 13, 8]
    deleted_count = Portfolio.objects.filter(id__in=ids_to_delete).delete()
    print(f"Deleted {deleted_count[0]} portfolios (IDs: {ids_to_delete})")

    # 2. Re-sequence IDs
    portfolios = list(Portfolio.objects.all().order_by('created_at', 'id'))
    
    # We'll use raw SQL to update IDs to avoid conflicts and handle foreign keys
    # SQLite doesn't support easy mass ID updates if there are FKs, 
    # but Portfolio -> Stock has on_delete=CASCADE. 
    # If we change Portfolio ID, we need to update Stock.portfolio_id.
    
    print(f"Resequencing {len(portfolios)} portfolios...")
    
    # Use a connection to handle manual ID updates
    from django.db import connection
    with connection.cursor() as cursor:
        # Disable foreign key checks for the session if possible
        cursor.execute("PRAGMA foreign_keys = OFF;")
        
        # 1. Move all to high IDs to avoid collision during re-sequencing
        for i, p in enumerate(portfolios):
            temp_id = 10000 + i
            cursor.execute("UPDATE portfolios_portfolio SET id = %s WHERE id = %s", [temp_id, p.id])
            cursor.execute("UPDATE portfolios_stock SET portfolio_id = %s WHERE portfolio_id = %s", [temp_id, p.id])
            p.id = temp_id # update in memory
            
        # 2. Move to sequential IDs
        for i, p in enumerate(portfolios):
            new_id = i + 1
            cursor.execute("UPDATE portfolios_portfolio SET id = %s WHERE id = %s", [new_id, p.id])
            cursor.execute("UPDATE portfolios_stock SET portfolio_id = %s WHERE portfolio_id = %s", [new_id, p.id])
            print(f"  Portfolio '{p.name}': {p.id} -> {new_id}")
            
        # 3. Reset the auto-increment sequence
        cursor.execute("DELETE FROM sqlite_sequence WHERE name='portfolios_portfolio';")
        cursor.execute("INSERT INTO sqlite_sequence (name, seq) VALUES ('portfolios_portfolio', %s);", [len(portfolios)])
        
        cursor.execute("PRAGMA foreign_keys = ON;")

    print("Resequencing complete.")

if __name__ == "__main__":
    resequence()
