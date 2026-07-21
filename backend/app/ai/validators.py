from typing import Dict, Any

def validate_requirements_dict(data: Dict[str, Any]) -> bool:
    """
    Validates that the provided dictionary contains all the required requirements keys
    and they are structured as lists of strings.
    """
    required_keys = {
        "functional_requirements",
        "non_functional_requirements",
        "business_rules",
        "assumptions",
        "dependencies",
        "risks"
    }
    
    # 1. Check all required keys exist
    for key in required_keys:
        if key not in data:
            return False
            
    # 2. Check each key's value is a list of strings
    for key in required_keys:
        value = data[key]
        if not isinstance(value, list):
            return False
        for item in value:
            if not isinstance(item, str):
                return False
                
    return True
