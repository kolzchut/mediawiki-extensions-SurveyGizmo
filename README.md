# SurveyGizmo Intercept Loader

MediaWiki extension for loading Alchemer (formerly SurveyGizmo) survey beacons.

## Configuration

### $wgSurveyGizmoBeaconID

Set your Alchemer Beacon ID:

```php
$wgSurveyGizmoBeaconID = 'your-beacon-id';
```

### $wgSurveyGizmoBeaconUrl

Set the Alchemer Beacon script URL:

```php
$wgSurveyGizmoBeaconUrl = 'https://...';
```

## Tracking Events

This extension tracks survey interactions using MediaWiki's `mw.track()` system. The following events are emitted:

- `survey.offered` - When a survey is offered to the user
- `survey.started` - When a user clicks to start a survey
- `survey.completed` - When a user submits a completed survey
- `survey.rejected` - When a user closes/rejects a survey offer

Each event includes:
- `action`: The event type (offered, started, completed, rejected)
- `label`: The survey ID (or null if not available)
- `value`: null

### Converting to Analytics Events

To send these events to Google Analytics, use the [GoogleTagManager extension](https://github.com/kolzchut/mediawiki-extensions-GoogleTagManager), which can listen to `mw.track()` events and forward them to the DataLayer.

## Release Log

### 0.4.1
- Modernized to use service injection and instance-based hook handlers
- Migrated to `AutoloadNamespaces` and PHP namespace `MediaWiki\Extension\SurveyGizmo`
- Renamed `modules/` to `resources/`
- Declared missing `$wgSurveyGizmoBeaconUrl` config variable in `extension.json`
- Updated dev dependencies

### 0.4.0
- Migrated from Google Universal Analytics to MediaWiki's `mw.track()` system
- Updated domain validation for Alchemer (surveygizmo.com → alchemer.com)
- Removed unused `getAllPreviousSurveys` function

### 0.3.1
- Previous releases
