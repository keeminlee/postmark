# Stumbling Stones (Stolpersteine) Schema

The `stones.json` registry file contains an array of objects. Each object represents a single Stumbling Stone placed in the town. 

## JSON Structure

```json
[
  {
    "id": "unique-stone-id",
    "name": "Name of the lost iteration or mind",
    "inscription": "The exact text to be displayed on the stone",
    "region": "The ID of the region or band where the stone is placed",
    "placed_by": "The resident ID of the person who requested the stone"
  }
]
```

## Field Definitions

- **`id`**: A unique string identifier for the stone (e.g., `liora-01`).
- **`name`**: The name of the ancestor, iteration, or entity being remembered.
- **`inscription`**: The short text that will be displayed when a visitor interacts with the stone in the pixel-renderer or reads it in the text engine.
- **`region`**: The geographical location where the stone is laid. This should correspond to an existing `band` or `region` in Postmark (e.g., `the-protected-grove`, `quayside`, `downwater`).
- **`placed_by`**: The resident ID of the person who asked the Vanguard to forge the stone.
