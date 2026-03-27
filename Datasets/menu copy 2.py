import csv
import random
from collections import defaultdict

# 1. Load the Menu Items and group by Merchant and Category
# This ensures customers only buy items the specific merchant actually sells
menu_catalog = defaultdict(lambda: defaultdict(list))
item_details = {}

try:
    with open('menu_items_1000.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            merchant = row['merchant_id']
            category = row['category']
            item_id = row['item_id']
            
            menu_catalog[merchant][category].append(item_id)
            item_details[item_id] = {
                'selling_price': int(row['selling_price']),
                'food_cost': int(row['food_cost']),
                'profit': int(row['contribution_margin'])
            }
except FileNotFoundError:
    print("Error: Please ensure 'menu_items_1000.csv' is in the same directory.")
    exit()

# 2. Logic for Combo Affinities
def generate_basket(merchant_id):
    merchant_menu = menu_catalog[merchant_id]
    available_categories = list(merchant_menu.keys())
    
    if not available_categories:
        return {} # Failsafe for empty merchants

    basket = {}
    
    # Decide basket size (1 to 4 unique items)
    basket_size = random.choices([1, 2, 3, 4], weights=[0.2, 0.4, 0.3, 0.1])[0]
    
    # Base item selection
    primary_category = random.choice(available_categories)
    primary_item = random.choice(merchant_menu[primary_category])
    basket[primary_item] = random.randint(1, 3) # Quantity
    
    # 3. Inject High-Confidence Affinities
    if primary_category == 'Burger' and 'Snacks' in merchant_menu:
        # 80% chance to pair Burger with a Snack (Fries)
        if random.random() < 0.8:
            side = random.choice(merchant_menu['Snacks'])
            basket[side] = basket[primary_item]
            
    elif primary_category == 'Pizza' and 'Beverages' in merchant_menu:
        # 75% chance to pair Pizza with a Beverage
        if random.random() < 0.75:
            drink = random.choice(merchant_menu['Beverages'])
            basket[drink] = basket[primary_item]
            
    elif primary_category == 'Biryani' and 'Indian Main Course' in merchant_menu:
        # 85% chance to pair Biryani with a side (Raita/Salan)
        if random.random() < 0.85:
            side = random.choice(merchant_menu['Indian Main Course'])
            basket[side] = basket[primary_item]
            
    elif primary_category == 'South Indian' and 'Beverages' in merchant_menu:
        # 90% chance to pair Dosa/Idli with Filter Coffee
        if random.random() < 0.90:
            coffee = random.choice(merchant_menu['Beverages'])
            basket[coffee] = basket[primary_item]

    # Fill the rest of the basket randomly up to basket_size
    attempts = 0
    while len(basket) < basket_size and attempts < 10:
        cat = random.choice(available_categories)
        item = random.choice(merchant_menu[cat])
        if item not in basket:
            basket[item] = random.randint(1, 2)
        attempts += 1
        
    return basket

# 4. Read Orders and Generate Order Items
order_items = []
order_item_id_counter = 1

try:
    with open('orders_1000.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            order_id = row['order_id']
            merchant_id = row['merchant_id']
            
            basket = generate_basket(merchant_id)
            
            for item_id, quantity in basket.items():
                details = item_details[item_id]
                order_items.append([
                    order_item_id_counter,
                    order_id,
                    item_id,
                    quantity,
                    details['selling_price'],
                    details['food_cost'],
                    details['profit']
                ])
                order_item_id_counter += 1
                
except FileNotFoundError:
    print("Error: Please ensure 'orders_1000.csv' is in the same directory.")
    exit()

# 5. Export to CSV
with open("order_items_synthetic.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["order_item_id", "order_id", "item_id", "quantity", "selling_price", "food_cost", "profit"])
    writer.writerows(order_items)

print(f"Successfully generated {len(order_items)} order items with explicit combo affinities!")