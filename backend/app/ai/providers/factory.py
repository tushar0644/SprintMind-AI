import os
from typing import Optional, Dict, Type
from app.core.config import settings
from .base import AIProvider
from .gemini import GeminiProvider

class ProviderFactory:
    """
    Factory for instantiating AI Providers based on environment configuration.
    Currently supports 'gemini' as the default and only active provider in Phase 1.1.
    """
    _providers: Dict[str, Type[AIProvider]] = {
        "gemini": GeminiProvider,
    }

    @classmethod
    def register_provider(cls, name: str, provider_cls: Type[AIProvider]):
        """Register a new provider class dynamically."""
        cls._providers[name.lower()] = provider_cls

    @classmethod
    def get_provider(
        cls, 
        provider_name: Optional[str] = None, 
        **kwargs
    ) -> AIProvider:
        """
        Instantiate and return the configured AIProvider instance.
        If provider_name is not passed, falls back to settings.AI_PROVIDER or 'gemini'.
        """
        selected_name = (
            provider_name 
            or getattr(settings, "AI_PROVIDER", None) 
            or os.getenv("AI_PROVIDER", "gemini")
        ).lower().strip()

        if selected_name not in cls._providers:
            raise ValueError(
                f"Unsupported AI provider '{selected_name}'. "
                f"Available providers: {list(cls._providers.keys())}"
            )

        provider_cls = cls._providers[selected_name]
        return provider_cls(**kwargs)
