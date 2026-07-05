# vitest-test-result-events
![Build](https://github.com/trevorism/vitest-test-result-events/actions/workflows/build.yml/badge.svg)
![npm](https://img.shields.io/npm/v/@trevorism/vitest-test-result-events)

Vitest reporter that sends a Trevorism `testResult` event when a run finishes, so a JavaScript
(vitest) suite reports back into the testing service the same way cucumber and cypress suites do.

## Usage

`vitest.config.js`
```js
import { defineConfig } from 'vitest/config'
import TrevorismTestResultReporter from '@trevorism/vitest-test-result-events'

export default defineConfig({
  test: {
    reporters: ['default', new TrevorismTestResultReporter('<service name>')]
  }
})
```

`<service name>` is the repository name (the `source` of the `TestSuite`), e.g. `health-dash`.

Reporting is **off by default** and only fires when the environment variable
`TREVORISM_TEST_EVENT=enabled` is set — so local `vitest run` stays quiet and only CI reports.
The shared `jstest.yml` workflow sets this flag.

The event posted to `https://event.data.trevorism.com/event/testResult` is:
```json
{
  "service": "<service name>",
  "kind": "javascript",
  "success": true,
  "numberOfTests": 43,
  "durationMillis": 1234,
  "date": "2026-07-04T00:00:00.000Z"
}
```

## Development
```
npm install
npm run build
npm run accept
```
