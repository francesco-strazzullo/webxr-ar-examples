const MODEL_OBJ_URL = '../assets/Coffee.obj'
const MODEL_MTL_URL = '../assets/Coffee.mtl'
const MODEL_SCALE = 0.001

const opacityRemap = mat => {
  if (mat.opacity === 0) {
    mat.opacity = 1
  }
}

const loadModel = async (objURL, mtlURL) => {
  const objLoader = new THREE.OBJLoader()
  const mtlLoader = new THREE.MTLLoader()

  mtlLoader.setTexturePath(mtlURL.substr(0, mtlURL.lastIndexOf('/') + 1))
  mtlLoader.setMaterialOptions({ ignoreZeroRGBs: true })

  return new Promise((resolve, reject) => {
    mtlLoader.load(mtlURL, materialCreator => {
      // We have our material package parsed from the .mtl file.
      // Be sure to preload it.
      materialCreator.preload()

      // Remap opacity values in the material to 1 if they're set as
      // 0; this is another peculiarity of Poly models and some
      // MTL materials.
      for (let material of Object.values(materialCreator.materials)) {
        opacityRemap(material)
      }

      // Give our OBJ loader our materials to apply it properly to the model
      objLoader.setMaterials(materialCreator)

      // Finally load our OBJ, and resolve the promise once found.
      objLoader.load(objURL, resolve, function () {}, reject)
    }, function () {}, reject)
  })
}

const lookAtOnY = (looker, target) => {
  const targetPos = new THREE.Vector3().setFromMatrixPosition(target.matrixWorld)

  const angle = Math.atan2(
    targetPos.x - looker.position.x,
    targetPos.z - looker.position.z)

  looker.rotation.set(0, angle, 0)
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

    loadModel(MODEL_OBJ_URL, MODEL_MTL_URL).then(model => {
      this.model = model
      this.model.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE)
      this.add(this.model)
    })

    this.add(this.ring)

    this.session = xrSession
    this.visible = false
    this.camera = camera
    this.raycaster = new THREE.Raycaster()
  }

  async update (frameOfRef) {
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera)

    const { ray } = this.raycaster

    const hit = await getHit(frameOfRef, this.session, ray)

    if (hit) {
      this.visible = true
      const hitMatrix = new THREE.Matrix4().fromArray(hit.hitMatrix)
      this.position.setFromMatrixPosition(hitMatrix)
      lookAtOnY(this, this.camera)

      if (this.model) {
        this.model.rotation.y = this.model.rotation.y + 0.01
      }
    }
  }
}
