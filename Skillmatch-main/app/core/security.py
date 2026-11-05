from passlib.context import CryptContext

pwd_context =CryptContext(
    schemes=["bcrypt"],
    deprecated= "auto"
)

def hashear_password(password: str):
    return pwd_context.hash(password)

def verificar_password(password: str, password_hasheada:str):
    return pwd_context.verify(password, password_hasheada)