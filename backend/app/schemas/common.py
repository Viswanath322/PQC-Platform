from typing import Annotated

from pydantic import StringConstraints

UUID_PATTERN = (
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)
UuidStr = Annotated[str, StringConstraints(pattern=UUID_PATTERN)]
