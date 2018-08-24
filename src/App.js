import Element from './Element.js'

const fixFramebuffer = (app) => {
  THREE.Object3D.prototype.onBeforeRender = () => {
    app.gl.bindFramebuffer(app.gl.FRAMEBUFFER, app.session.baseLayer.framebuffer)
  }
}

const createSceneWithLight = () => {
  const scene = new THREE.Scene()

  const light = new THREE.AmbientLight(0xffffff, 1)
  scene.add(light)

  return scene
}

export default class App {
  constructor () {
    this.onXRFrame = this.onXRFrame.bind(this)
    this.onEnterAR = this.onEnterAR.bind(this)

    this.init()
  }

  async init () {
    if (navigator.xr && XRSession.prototype.requestHitTest) {
      try {
        this.device = await navigator.xr.requestDevice()
      } catch (e) {
        console.log(e)
        this.onNoXRDevice()
        return
      }
    } else {
      this.onNoXRDevice()
      return
    }

    document.querySelector('#enter-ar').addEventListener('click', this.onEnterAR)
  }

  async onEnterAR () {
    document.body.webkitRequestFullScreen()

    const outputCanvas = document.createElement('canvas')
    const ctx = outputCanvas.getContext('xrpresent')

    try {
      const session = await this.device.requestSession({
        outputContext: ctx,
        environmentIntegration: true
      })

      document.body.appendChild(outputCanvas)
      this.onSessionStarted(session)
    } catch (e) {
      console.error(e)
      this.onNoXRDevice()
    }
  }

  onNoXRDevice () {
    window.alert('XR Not supported')
  }

  async onSessionStarted (session) {
    this.session = session

    fixFramebuffer(this)

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      preserveDrawingBuffer: true
    })
    this.renderer.autoClear = false

    this.gl = this.renderer.getContext()

    await this.gl.setCompatibleXRDevice(this.session.device)

    this.session.baseLayer = new XRWebGLLayer(this.session, this.gl)

    this.scene = createSceneWithLight()

    this.camera = new THREE.PerspectiveCamera()
    this.camera.matrixAutoUpdate = false

    this.element = new Element(this.session, this.camera)
    this.scene.add(this.element)

    this.frameOfRef = await this.session.requestFrameOfReference('eye-level')
    this.session.requestAnimationFrame(this.onXRFrame)
  }

  onXRFrame (time, frame) {
    const session = frame.session
    const pose = frame.getDevicePose(this.frameOfRef)
    this.element.update(this.frameOfRef)

    session.requestAnimationFrame(this.onXRFrame)

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.session.baseLayer.framebuffer)

    if (pose) {
      for (let view of frame.views) {
        const viewport = session.baseLayer.getViewport(view)
        this.renderer.setSize(viewport.width, viewport.height)

        this.camera.projectionMatrix.fromArray(view.projectionMatrix)
        const viewMatrix = new THREE.Matrix4().fromArray(pose.getViewMatrix(view))
        this.camera.matrix.getInverse(viewMatrix)
        this.camera.updateMatrixWorld(true)

        this.renderer.clearDepth()

        this.renderer.render(this.scene, this.camera)
      }
    }
  }
};
