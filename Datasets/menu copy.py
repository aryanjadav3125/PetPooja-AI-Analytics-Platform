import csv
import random
from datetime import datetime, timedelta

def generate_order_time_and_amount(current_date):
    """Determines order time based on Indian dining peaks and weekend surge logic."""
    is_weekend = current_date.weekday() >= 4 # Friday (4), Saturday (5), Sunday (6)
    
    # Time clustering weights: Lunch (35%), Snack (10%), Dinner (55%)
    peak = random.choices(['lunch', 'snack', 'dinner'], weights=[0.35, 0.10, 0.55])[0]
    
    if peak == 'lunch':
        hour = random.choice([12, 13, 14])
        minute = random.randint(0, 59) if hour != 14 else random.randint(0, 30)
        amount = random.randint(200, 600)
    elif peak == 'snack':
        hour = random.randint(15, 18)
        minute = random.randint(0, 59)
        amount = random.randint(200, 400)
    else: # dinner
        hour = random.choice([19, 20, 21, 22])
        minute = random.randint(0, 59) if hour != 22 else random.randint(0, 30)
        # Weekend dinners surge heavily in multi-item combo values
        amount = random.randint(600, 1500) if is_weekend else random.randint(300, 900)
        
    order_time = current_date.replace(hour=hour, minute=minute, second=0)
    return order_time, amount

# Define channels with their respective market share weights
channels = ['zomato', 'swiggy', 'online', 'walkin', 'voice']
channel_weights = [0.35, 0.35, 0.15, 0.10, 0.05]

start_date = datetime(2025, 10, 1)
current_date = start_date

rows = []
order_id_counter = 100001

while len(rows) < 1000:
    # Weekend volume escalation (+40% likelihood to generate multiple orders per day)
    orders_today = random.randint(8, 15) if current_date.weekday() >= 4 else random.randint(4, 9)
    
    for _ in range(orders_today):
        if len(rows) >= 1000:
            break
            
        merchant_id = f"M{random.randint(1, 50):03d}"
        order_time, total_amount = generate_order_time_and_amount(current_date)
        order_channel = random.choices(channels, weights=channel_weights)[0]
        
        # Generate random 10-digit Indian mobile number
        prefix = random.choice(['9', '8', '7'])
        customer_phone = prefix + ''.join([str(random.randint(0, 9)) for _ in range(9)])
        
        rows.append([
            order_id_counter, 
            merchant_id, 
            order_time.strftime("%Y-%m-%d %H:%M:%S"), 
            order_channel, 
            customer_phone, 
            total_amount
        ])
        
        order_id_counter += 1
        
    current_date += timedelta(days=1)

# Write to CSV
with open("orders_1000.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["order_id", "merchant_id", "order_time", "order_channel", "customer_phone", "total_amount"])
    writer.writerows(rows)

print("Successfully generated 1,000 temporal-accurate rows in 'orders_1000.csv'")