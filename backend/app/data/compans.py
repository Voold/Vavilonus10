from .db_session import SqlAlchemyBase
from sqlalchemy import Column, Integer, Text, ForeignKey, String, JSON
from sqlalchemy.orm import declarative_base, relationship


class Company(SqlAlchemyBase):
    __tablename__ = "Company"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(Text)
    director_id = Column(Integer, ForeignKey("User.id"), nullable=False)
    inn = Column(Text, nullable=False)
    folder_path = Column(Text, nullable=False)
    emploees_inn = Column(JSON)
