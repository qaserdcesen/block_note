from datetime import datetime
from typing import Optional


def check_weather_condition(condition: Optional[str]) -> bool:
    if not condition:
        return True
    # TODO: integrate with a weather provider
    return condition == "sunny"


def check_location_trigger(lat: Optional[float], lon: Optional[float], radius_m: Optional[float]) -> bool:
    # TODO: plug in geofencing logic
    return False if None in (lat, lon, radius_m) else True


def check_behavior_rule(rule: Optional[str], last_activity: Optional[datetime]) -> bool:
    # TODO: evaluate DSL or JSON rules
    return bool(rule and last_activity)

