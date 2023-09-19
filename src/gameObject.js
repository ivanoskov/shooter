import * as THREE from "three";
import * as CANNON from "cannon-es";

export default class GameObject {
  constructor(
    geometry = new THREE.BufferGeometry(),
    material = new THREE.Material(),
    physicShape = CANNON.Shape,
    physicBody = CANNON.Body,
  ) {
    this.geometry = geometry;
    this.material = material;
    this.physicShape = physicShape;
    this.physicBody = physicBody;
  }
}

// export default class CannonDebugRenderer {
//     public scene: THREE.Scene
//     public world: CANNON.World
//     private _meshes: THREE.Mesh[] | THREE.Points[]
//     private _material: THREE.MeshBasicMaterial
//     private _particleMaterial = new THREE.PointsMaterial()
//     private _sphereGeometry: THREE.SphereGeometry
//     private _boxGeometry: THREE.BoxGeometry
//     private _cylinderGeometry: THREE.CylinderGeometry
//     private _planeGeometry: THREE.PlaneGeometry
//     private _particleGeometry: THREE.BufferGeometry

//     private tmpVec0: CANNON.Vec3 = new CANNON.Vec3()
//     private tmpVec1: CANNON.Vec3 = new CANNON.Vec3()
//     private tmpVec2: CANNON.Vec3 = new CANNON.Vec3()
//     private tmpQuat0: CANNON.Quaternion = new CANNON.Quaternion()

//     constructor(scene: THREE.Scene, world: CANNON.World, options?: object) {
//         options = options || {}

//         this.scene = scene
//         this.world = world

//         this._meshes = []

//         this._material = new THREE.MeshBasicMaterial({
//             color: 0x00ff00,
//             wireframe: true,
//         })
//         this._particleMaterial = new THREE.PointsMaterial({
//             color: 0xff0000,
//             size: 10,
//             sizeAttenuation: false,
//             depthTest: false,
//         })
//         this._sphereGeometry = new THREE.SphereGeometry(1)
//         this._boxGeometry = new THREE.BoxGeometry(1, 1, 1)
//         this._cylinderGeometry = new THREE.CylinderGeometry(1, 1, 2, 8)
//         this._planeGeometry = new THREE.PlaneGeometry(10, 10, 10, 10)
//         this._particleGeometry = new THREE.BufferGeometry()
//         this._particleGeometry.setFromPoints([new THREE.Vector3(0, 0, 0)])
//     }

//     public update() {
//         const bodies: CANNON.Body[] = this.world.bodies
//         const meshes: THREE.Mesh[] | THREE.Points[] = this._meshes
//         const shapeWorldPosition: CANNON.Vec3 = this.tmpVec0
//         const shapeWorldQuaternion: CANNON.Quaternion = this.tmpQuat0

//         let meshIndex = 0

//         for (let i = 0; i !== bodies.length; i++) {
//             const body = bodies[i]

//             for (let j = 0; j !== body.shapes.length; j++) {
//                 const shape = body.shapes[j]

//                 this._updateMesh(meshIndex, body, shape)

//                 const mesh = meshes[meshIndex]

//                 if (mesh) {
//                     // Get world position
//                     body.quaternion.vmult(
//                         body.shapeOffsets[j],
//                         shapeWorldPosition
//                     )
//                     body.position.vadd(shapeWorldPosition, shapeWorldPosition)

//                     // Get world quaternion
//                     body.quaternion.mult(
//                         body.shapeOrientations[j],
//                         shapeWorldQuaternion
//                     )

//                     // Copy to meshes
//                     mesh.position.x = shapeWorldPosition.x
//                     mesh.position.y = shapeWorldPosition.y
//                     mesh.position.z = shapeWorldPosition.z
//                     mesh.quaternion.x = shapeWorldQuaternion.x
//                     mesh.quaternion.y = shapeWorldQuaternion.y
//                     mesh.quaternion.z = shapeWorldQuaternion.z
//                     mesh.quaternion.w = shapeWorldQuaternion.w
//                 }

//                 meshIndex++
//             }
//         }

//         for (let i = meshIndex; i < meshes.length; i++) {
//             const mesh: THREE.Mesh | THREE.Points = meshes[i]
//             if (mesh) {
//                 this.scene.remove(mesh)
//             }
//         }

//         meshes.length = meshIndex
//     }

//     private _updateMesh(index: number, body: CANNON.Body, shape: CANNON.Shape) {
//         let mesh = this._meshes[index]
//         if (!this._typeMatch(mesh, shape)) {
//             if (mesh) {
//                 //console.log(shape.type)
//                 this.scene.remove(mesh)
//             }
//             mesh = this._meshes[index] = this._createMesh(shape)
//         }
//         this._scaleMesh(mesh, shape)
//     }

//     private _typeMatch(
