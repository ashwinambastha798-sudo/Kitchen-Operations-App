from sqlalchemy import Column, Integer, String, Float
from database import Base

class InventoryBatch(Base):
    __tablename__ = "inventory_batches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, default="default")
    name = Column(String, index=True)
    quantity = Column(Float)
    unit = Column(String)
    unitCost = Column(Float)
    orderDate = Column(String)
    expiryDate = Column(String)

class MenuItem(Base):
    __tablename__ = "menu_items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    basePrice = Column(Float)
    ingredients_json = Column(String)

class ParLevel(Base):
    __tablename__ = "par_levels"
    
    id = Column(Integer, primary_key=True, index=True)
    ingredient = Column(String, unique=True, index=True)
    level = Column(Float)
    cost = Column(Float)
    unit = Column(String)
