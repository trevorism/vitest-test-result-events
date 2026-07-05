import axios from 'axios'

const EVENT_URL = 'https://event.data.trevorism.com/event/testResult'

/**
 * Vitest reporter that emits a Trevorism `testResult` event when a run finishes, so a
 * JavaScript (vitest) suite reports back into the testing service the same way cucumber and
 * cypress suites do.
 *
 * Reporting is off unless TREVORISM_TEST_EVENT=enabled, so a local `vitest run` stays quiet and
 * only CI (the shared jstest workflow) reports. The service name is the repository name, matched
 * by the testing service against a TestSuite of kind "javascript".
 *
 *   // vitest.config.js
 *   import TrevorismTestResultReporter from '@trevorism/vitest-test-result-events'
 *   export default defineConfig({
 *     test: { reporters: ['default', new TrevorismTestResultReporter('health-dash')] }
 *   })
 */
class TrevorismTestResultReporter {
  constructor(service, options = {}) {
    if (!service) {
      throw new Error('Missing required option: service')
    }
    this.service = service
    this.eventUrl = options.eventUrl || EVENT_URL
    this.enabled =
      options.enabled === undefined ? process.env.TREVORISM_TEST_EVENT === 'enabled' : options.enabled
    this.startMillis = Date.now()
    this.reported = false
    // Decided in onInit from the running vitest version; controls which finish hook reports.
    this.useTestRunEnd = undefined
  }

  onInit(vitest) {
    this.startMillis = Date.now()
    const major = parseInt(String(vitest?.version || '').split('.')[0], 10)
    if (!Number.isNaN(major)) {
      this.useTestRunEnd = major >= 4
    }
  }

  onTestRunStart() {
    this.startMillis = Date.now()
  }

  // Vitest >= 4
  async onTestRunEnd(testModules = [], unhandledErrors = []) {
    if (this.useTestRunEnd === false) {
      return
    }
    let total = 0
    let failed = 0
    for (const testModule of testModules) {
      for (const testCase of testModule.children.allTests()) {
        total++
        if (testCase.result()?.state === 'failed') {
          failed++
        }
      }
    }
    await this.send(total, failed === 0 && unhandledErrors.length === 0)
  }

  // Vitest <= 3
  async onFinished(files = [], errors = []) {
    if (this.useTestRunEnd === true) {
      return
    }
    const { total, failed } = countLegacyTasks(files)
    await this.send(total, failed === 0 && (errors?.length ?? 0) === 0)
  }

  async send(numberOfTests, success) {
    if (this.reported) {
      return
    }
    this.reported = true

    if (!this.enabled) {
      console.log('Trevorism test event sending is disabled. Set TREVORISM_TEST_EVENT=enabled to enable it.')
      return
    }

    const testEvent = {
      service: this.service,
      kind: 'javascript',
      success,
      numberOfTests,
      durationMillis: Date.now() - this.startMillis,
      date: new Date().toISOString(),
    }

    try {
      console.log('Sending javascript test result event.')
      await axios.post(this.eventUrl, testEvent, { headers: { 'Content-Type': 'application/json' } })
    } catch (error) {
      console.error(error)
    }
  }
}

// Vitest <= 3 result shape: files -> nested tasks; a leaf test has type 'test'.
function countLegacyTasks(tasks, acc = { total: 0, failed: 0 }) {
  for (const task of tasks || []) {
    if (task.type === 'test') {
      acc.total++
      if (task.result && task.result.state === 'fail') {
        acc.failed++
      }
    } else if (task.tasks) {
      countLegacyTasks(task.tasks, acc)
    }
  }
  return acc
}

module.exports = TrevorismTestResultReporter
