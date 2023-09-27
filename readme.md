# Разработка web-шутера от первого лица

## TODO

- [x] Старт поинт разработки <br> ![Sample Screenshot](docs/img/screenshot_1.png)
- [x] Добавлена вкладка дебага <br> ![Sample Screenshot](docs/img/screenshot_2.png)
- [x] На вкладку дебага добавлен флаг включения помощника Octree (Octree - система дискретизации пространства для эффективости просчета коллизий) <br> ![Sample Screenshot](docs/img/screenshot_3.png)
- [x] Добавлены тени на сцене, а также новый свет, имитирующий повсеместные солнечные лучи <br> ![Sample Screenshot](docs/img/screenshot_4.png)
- [x] Написан класс Player для всей логики игрока <br>

  ```js
  export class Player {

  constructor(position, colliderHeight, colliderRadius, scene, camera) {
    this.position = position;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.onFloor = false;
    this.collider = new Capsule(
        this.position,
        new THREE.Vector3().copy(this.position).add(new THREE.Vector3(0, colliderHeight, 0)),
        colliderRadius
    );
    this.camera = camera;
    camera.rotation.order = "YXZ";
    scene.add(camera);
  }

  getForwardVector() {
    this.camera.getWorldDirection(this.direction);
    this.direction.y = 0;
    this.direction.normalize();

    return this.direction;

  }

  getSideVector() {
    this.camera.getWorldDirection(this.direction);
    this.direction.y = 0;
    this.direction.normalize();
    this.direction.cross(this.camera.up);
    return this.direction;

  }

  controls(deltaTime, keyStates) {
    // gives a bit of air control
    const speedDelta = deltaTime \* (this.onFloor ? 25 : 8);

    if (keyStates["KeyW"]) {
      this.velocity.add(this.getForwardVector().multiplyScalar(speedDelta));
    }
    if (keyStates["KeyS"]) {
      this.velocity.add(this.getForwardVector().multiplyScalar(-speedDelta));
    }
    if (keyStates["KeyA"]) {
      this.velocity.add(this.getSideVector().multiplyScalar(-speedDelta));
    }
    if (keyStates["KeyD"]) {
      this.velocity.add(this.getSideVector().multiplyScalar(speedDelta));
    }
    if (this.onFloor) {
      if (keyStates["Space"]) {
        this.velocity.y = 15;
      }
    }

  }

  collisions(worldOctree) {
    const result = worldOctree.capsuleIntersect(this.collider);

    this.onFloor = false;
    if (result) {
      this.onFloor = result.normal.y > 0;
      if (!this.onFloor) {
        this.velocity.addScaledVector(
          result.normal,
          -result.normal.dot(this.velocity)
        );
      }
      this.collider.translate(result.normal.multiplyScalar(result.depth));
    }

  }

  update(deltaTime, worldOctree) {
    let damping = Math.exp(-4 \* deltaTime) - 1;

    if (!this.onFloor) {
      this.velocity.y -= GRAVITY * deltaTime;
      // small air resistance
      damping *= 0.1;
    }
    this.velocity.addScaledVector(this.velocity, damping);
    const deltaPosition = this.velocity.clone().multiplyScalar(deltaTime);
    this.collider.translate(deltaPosition);
    this.collisions(worldOctree);
    this.camera.position.copy(this.collider.end);

  }
  }
  ```

- [x] Разработана система редактирования карты через json-список в файле map.js. Начальное API: <br>
  ```js
  (property) STATIC_OBJECTS: {
      LOAD_OBJECTS: {
          position: Vector3;
          file: string;
      }[];
      THREE_OBJESCTS: {
          type: string;
          position: Vector3;
          geometry: Vector3;
          color: string;
      }[];
  }
  ``` 
  <br> Таким образом можно добавлять объекты, как с помощью моделей, так и стандартных элементарных объектв, таких как box: <br> ![Sample Screenshot](docs/img/screenshot_5.png)