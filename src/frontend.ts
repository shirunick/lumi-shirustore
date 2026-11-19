import type { SpindleFrontendContext } from 'lumiverse-spindle-types'
import { registerDrawerTab } from './frontend/drawer-tab'
import { RpcClient } from './frontend/rpc-client'
import { addShiruStoreStyles } from './frontend/styles'

export function setup(ctx: SpindleFrontendContext) {
  const removeStyle = addShiruStoreStyles(ctx)
  const rpc = new RpcClient(ctx)
  const tab = registerDrawerTab({ ctx, rpc })

  return () => {
    tab.destroy()
    rpc.destroy()
    removeStyle()
    ctx.dom.cleanup()
  }
}
