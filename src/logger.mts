import {createDebugLogger,setupConsoleLogger} from '@facing/logger'
const Logger = createDebugLogger('faple')
setupConsoleLogger(Logger)
export default Logger