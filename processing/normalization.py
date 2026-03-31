from config.schema import GlobalEvent
from config.settings import setup_logger

logger = setup_logger("processing.normalization")

class Normalizer:
    @staticmethod
    def normalize(raw_dict: dict) -> GlobalEvent:
        """
        Validates and ensures the raw Kafka dict maps correctly to GlobalEvent.
        """
        try:
            event = GlobalEvent(**raw_dict)
            return event
        except Exception as e:
            logger.error(f"Normalization failed for event: {raw_dict.get('event_id', 'Unknown')}. Error: {e}")
            raise
