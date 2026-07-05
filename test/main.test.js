import Reporter from '../src/main.js'
import { test, expect, afterEach } from 'vitest'
import sinon from 'sinon'
import axios from 'axios'

// Build a fake vitest-4 TestModule whose tests have the given result states.
function fakeModule(states) {
  return {
    children: {
      *allTests() {
        for (const state of states) {
          yield { result: () => ({ state }) }
        }
      },
    },
  }
}

afterEach(() => {
  sinon.restore()
})

test('throws when the service name is missing', () => {
  expect(() => new Reporter()).toThrow('Missing required option: service')
})

test('does not post when reporting is disabled', async () => {
  const stub = sinon.stub(axios, 'post').resolves({ data: {} })
  const reporter = new Reporter('health-dash', { enabled: false })

  reporter.onInit({ version: '4.1.9' })
  await reporter.onTestRunEnd([fakeModule(['passed'])], [])

  expect(stub.called).toBe(false)
})

test('posts a javascript testResult event with counts when enabled (vitest 4)', async () => {
  const stub = sinon.stub(axios, 'post').resolves({ data: {} })
  const reporter = new Reporter('health-dash', { enabled: true })

  reporter.onInit({ version: '4.1.9' })
  await reporter.onTestRunEnd([fakeModule(['passed', 'failed', 'passed'])], [])

  expect(stub.calledOnce).toBe(true)
  const [url, body] = stub.firstCall.args
  expect(url).toContain('/event/testResult')
  expect(body).toMatchObject({
    service: 'health-dash',
    kind: 'javascript',
    numberOfTests: 3,
    success: false,
  })
  expect(typeof body.durationMillis).toBe('number')
  expect(body.date).toBeTruthy()
})

test('reports success when there are no failures', async () => {
  const stub = sinon.stub(axios, 'post').resolves({ data: {} })
  const reporter = new Reporter('health-dash', { enabled: true })

  reporter.onInit({ version: '4.1.9' })
  await reporter.onTestRunEnd([fakeModule(['passed', 'passed'])], [])

  expect(stub.firstCall.args[1]).toMatchObject({ numberOfTests: 2, success: true })
})

test('treats unhandled errors as a failed run', async () => {
  const stub = sinon.stub(axios, 'post').resolves({ data: {} })
  const reporter = new Reporter('health-dash', { enabled: true })

  reporter.onInit({ version: '4.1.9' })
  await reporter.onTestRunEnd([fakeModule(['passed'])], [new Error('boom')])

  expect(stub.firstCall.args[1]).toMatchObject({ success: false })
})

test('reports only once even if both finish hooks fire', async () => {
  const stub = sinon.stub(axios, 'post').resolves({ data: {} })
  const reporter = new Reporter('health-dash', { enabled: true })

  reporter.onInit({ version: '4.1.9' })
  await reporter.onTestRunEnd([fakeModule(['passed'])], [])
  await reporter.onFinished([], [])

  expect(stub.calledOnce).toBe(true)
})

test('counts nested tasks on legacy vitest (<= 3)', async () => {
  const stub = sinon.stub(axios, 'post').resolves({ data: {} })
  const reporter = new Reporter('health-dash', { enabled: true })

  reporter.onInit({ version: '3.0.0' })
  const files = [
    {
      type: 'suite',
      tasks: [
        { type: 'test', result: { state: 'pass' } },
        { type: 'suite', tasks: [{ type: 'test', result: { state: 'fail' } }] },
      ],
    },
  ]
  await reporter.onFinished(files, [])

  expect(stub.calledOnce).toBe(true)
  expect(stub.firstCall.args[1]).toMatchObject({ numberOfTests: 2, success: false })
})
