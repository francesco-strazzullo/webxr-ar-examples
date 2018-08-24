import * as THREE from '//cdnjs.cloudflare.com/ajax/libs/three.js/95/three.module.js'

const lookAtOnY = (looker, target) => {
  const targetPos = new THREE.Vector3().setFromMatrixPosition(target.matrixWorld)

  const angle = Math.atan2(
    targetPos.x - looker.position.x,
    targetPos.z - looker.position.z)

  looker.rotation.set(0, angle, 0)
}

const createCube = () => {
  const geometry = new THREE.BoxBufferGeometry(0.05, 0.05, 0.05)
  const material = new THREE.MeshNormalMaterial()
  return new THREE.Mesh(geometry, material)
}

const createRing = () => {
  let geometry = new THREE.RingGeometry(0.08, 0.09, 48)
  let material = new THREE.MeshBasicMaterial({ color: 0xffffff })

  geometry.applyMatrix(new THREE.Matrix4().makeRotationX(THREE.Math.degToRad(-90)))

  return new THREE.Mesh(geometry, material)
}

const getHit = async (frameOfRef, session, ray) => {
  const origin = new Float32Array(ray.origin.toArray())
  const direction = new Float32Array(ray.direction.toArray())
  const hits = await session.requestHitTest(origin,
    direction,
    frameOfRef)

  return hits.length ? hits[0] : undefined
}

export default class Reticle extends THREE.Object3D {
  constructor (xrSession, camera) {
    super()

    this.ring = createRing()
    this.cube = createCube()

    this.add(this.ring)
    this.add(this.cube)

    this.session = xrSession
    this.visible = false
    this.camera = camera
    this.raycaster = new THREE.Raycaster()
  }

  async update (frameOfRef) {
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera)

    const { ray } = this.raycaster

    const hit = await getHit(frameOfRef, this.session, ray)

    this.visible = !!hit

    if (this.visible) {
      const hitMatrix = new THREE.Matrix4().fromArray(hit.hitMatrix)
      this.position.setFromMatrixPosition(hitMatrix)
      lookAtOnY(this, this.camera)

      this.cube.rotation.y = this.cube.rotation.y + 0.01
    }
  }
}
