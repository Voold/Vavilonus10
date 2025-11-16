# data/users.py
from .db_session import SqlAlchemyBase
from sqlalchemy import Column, Integer, Text, ForeignKey, String
from sqlalchemy.orm import relationship


class User(SqlAlchemyBase):
    __tablename__ = "User"

    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(Text, nullable=False)
    hashed_password = Column(Text, nullable=True) # nullable=True, если пароль не всегда задан при создании
    inn = Column(Integer, nullable=False, unique=True) # Уникальность ИНН
    company_id = Column(Integer, ForeignKey('Company.id'), nullable=True) # Ссылка на компанию, может быть NULL
    role = Column(String(50), default="worker") # Роль по умолчанию теперь "worker"
    folder_path = Column(Text)

    # Связь с Company
    # Указываем foreign_keys, чтобы SQLAlchemy понимал, какое поле использовать
    company = relationship('Company', foreign_keys=[company_id])