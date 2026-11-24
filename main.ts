
// Arcade Ballistics - MakeCode Arcade extension
// Constant-acceleration projectile physics with barrel-tip spawning,
// moving-target prediction, bouncing targets, and changing wind.

/**
 * Built-in ammunition presets. Mass is a gameplay mass value, not kilograms.
 */


namespace ballistics {
    let currentWindX = 0
    let lastAngle = 0
    let lastFlightTime = 0
    
    /**
 * Built-in ammunition presets. Mass is a gameplay mass value, not kilograms.
 */
    //% blockNamespace="ballistics"
    export enum Ammunition {
        //% block="light"
        Light,
        //% block="standard"
        Standard,
        //% block="heavy"
        Heavy,
        //% block="precision"
        Precision
    }
    let trackedTargets: Sprite[] = []
    let targetMinX: number[] = []
    let targetMaxX: number[] = []
    let targetMinY: number[] = []
    let targetMaxY: number[] = []

    //% block="wind acceleration X"
    //% group="Wind"
    //% weight=90
    //% blockHidden=true
    export function _internalWindX(): number {
        return currentWindX
    }

    /**
     * Set horizontal wind acceleration. Positive pushes right; negative pushes left.
     */
    //% block="set wind acceleration X to $acceleration"
    //% acceleration.defl=0
    //% group="Wind"
    //% weight=100
    //% blockId=ballistics_set_wind
    export function setWind(acceleration: number): void {
        currentWindX = acceleration
    }

    /**
     * Randomly changes wind direction and strength at a fixed interval.
     */
    //% block="start changing wind from $minimum to $maximum every $interval milliseconds"
    //% minimum.defl=-25 maximum.defl=25 interval.defl=4000
    //% group="Wind"
    //% weight=90
    //% blockId=ballistics_random_wind
    export function startRandomWind(minimum: number, maximum: number, interval: number): void {
        if (interval < 250) interval = 250
        game.onUpdateInterval(interval, function () {
            currentWindX = randint(minimum, maximum)
        })
    }

    /**
     * Read the current horizontal wind acceleration.
     */
    //% block="current wind acceleration X"
    //% group="Wind"
    //% weight=80
    //% blockId=ballistics_get_wind
    //% blockHidden=true
    export function windX(): number {
        return currentWindX
    }

    /**
     * Set a sprite's velocity in pixels per second.
     */
    //% block="set $target velocity X $velocityX Y $velocityY"
    //% group="Target movement"
    //% velocityX.defl=30 velocityY.defl=0
    //% weight=100
    //% blockId=ballistics_set_target_velocity
    export function setTargetVelocity(target: Sprite, velocityX: number, velocityY: number): void {
        target.vx = velocityX
        target.vy = velocityY
    }

    /**
     * Give a target a random direction and speed, and make it bounce inside bounds.
     */
    //% block="make $target move randomly at speed $minimumSpeed to $maximumSpeed bouncing inside left $left right $right top $top bottom $bottom"
    //% minimumSpeed.defl=20 maximumSpeed.defl=55 left.defl=75 right.defl=150 top.defl=12 bottom.defl=105
    //% group="Target movement"
    //% weight=90
    //% blockId=ballistics_random_moving_target
    export function makeRandomMovingTarget(
        target: Sprite,
        minimumSpeed: number,
        maximumSpeed: number,
        left: number,
        right: number,
        top: number,
        bottom: number
    ): void {
        if (minimumSpeed < 0) minimumSpeed = 0
        if (maximumSpeed < minimumSpeed) maximumSpeed = minimumSpeed

        const direction = randint(0, 359) * Math.PI / 180
        const speed = randint(minimumSpeed, maximumSpeed)
        target.vx = Math.cos(direction) * speed
        target.vy = Math.sin(direction) * speed

        let index = trackedTargets.indexOf(target)
        if (index < 0) {
            trackedTargets.push(target)
            targetMinX.push(left)
            targetMaxX.push(right)
            targetMinY.push(top)
            targetMaxY.push(bottom)
        } else {
            targetMinX[index] = left
            targetMaxX[index] = right
            targetMinY[index] = top
            targetMaxY[index] = bottom
        }
    }

    /**
     * Change the random direction and speed of an already moving target.
     */
    //% block="randomize movement of $target speed $minimumSpeed to $maximumSpeed"
    //% minimumSpeed.defl=20 maximumSpeed.defl=55
    //% group="Target movement"
    //% weight=80
    //% blockId=ballistics_randomize_target
    export function randomizeTargetMovement(target: Sprite, minimumSpeed: number, maximumSpeed: number): void {
        if (minimumSpeed < 0) minimumSpeed = 0
        if (maximumSpeed < minimumSpeed) maximumSpeed = minimumSpeed
        const direction = randint(0, 359) * Math.PI / 180
        const speed = randint(minimumSpeed, maximumSpeed)
        target.vx = Math.cos(direction) * speed
        target.vy = Math.sin(direction) * speed
    }

    // Bounce registered moving targets against their configured rectangle.
    game.onUpdateInterval(20, function () {
        for (let i = trackedTargets.length - 1; i >= 0; i--) {
            const target = trackedTargets[i]
            if (target) {
                if (target.x < targetMinX[i]) {
                    target.x = targetMinX[i]
                    target.vx = Math.abs(target.vx)
                } else if (target.x > targetMaxX[i]) {
                    target.x = targetMaxX[i]
                    target.vx = -Math.abs(target.vx)
                }
                if (target.y < targetMinY[i]) {
                    target.y = targetMinY[i]
                    target.vy = Math.abs(target.vy)
                } else if (target.y > targetMaxY[i]) {
                    target.y = targetMaxY[i]
                    target.vy = -Math.abs(target.vy)
                }
            }
        }
    })

    /**
     * Set a sprite's rotation angle in degrees. This is a helper value for
     * projects using a separate rotation extension; it does not rotate the sprite.
     */
    //% block="last calculated launch angle"
    //% group="Barrel"
    //% weight=70
    //% blockId=ballistics_last_angle
    export function lastLaunchAngle(): number {
        return lastAngle
    }

    /**
     * Read the flight time from the most recent shot, in seconds.
     */
    //% block="last calculated flight time seconds"
    //% group="Ballistics"
    //% weight=60
    //% blockId=ballistics_last_time
    export function lastFlightTimeSeconds(): number {
        return lastFlightTime
    }

    /**
     * Calculate the X coordinate of the muzzle at the supplied gun angle.
     */
    //% block="muzzle X of $gun at angle $gunAngle degrees barrel length $barrelLength offset $offset degrees"
    //% gunAngle.defl=0 barrelLength.defl=19 offset.defl=0
    //% group="Barrel"
    //% weight=100
    //% blockId=ballistics_muzzle_x
    export function muzzleX(gun: Sprite, gunAngle: number, barrelLength: number, offset: number): number {
        const radians = (gunAngle + offset) * Math.PI / 180
        return gun.x + Math.cos(radians) * barrelLength
    }

    /**
     * Calculate the Y coordinate of the muzzle at the supplied gun angle.
     */
    //% block="muzzle Y of $gun at angle $gunAngle degrees barrel length $barrelLength offset $offset degrees"
    //% gunAngle.defl=0 barrelLength.defl=19 offset.defl=0
    //% group="Barrel"
    //% weight=90
    //% blockId=ballistics_muzzle_y
    export function muzzleY(gun: Sprite, gunAngle: number, barrelLength: number, offset: number): number {
        const radians = (gunAngle + offset) * Math.PI / 180
        return gun.y + Math.sin(radians) * barrelLength
    }

    /**
     * Fire toward a stationary point. The solver accounts for gravity and wind.
     * The projectile spawns at the barrel tip along the calculated launch angle.
     */
    //% block="fire $bulletImage as kind $kind from gun $gun toward X $targetX Y $targetY speed $speed gravity $gravity barrel length $barrelLength offset $offset degrees lifetime $lifetime ms"
    //% speed.defl=115 gravity.defl=95 barrelLength.defl=19 offset.defl=0 lifetime.defl=3000
    //% group="Ballistics"
    //% weight=100
    //% blockId=ballistics_fire_at_point
    export function fireAtPoint(
        bulletImage: Image,
        kind: number,
        gun: Sprite,
        targetX: number,
        targetY: number,
        speed: number,
        gravity: number,
        barrelLength: number,
        offset: number,
        lifetime: number
    ): Sprite {
        return fireSolved(bulletImage, kind, gun, targetX, targetY, 0, 0,
            speed, gravity, currentWindX, barrelLength, offset, lifetime, 1, false)
    }

    /**
     * Fire at a moving sprite. Predicts its future position using its velocity,
     * while accounting for gravity and horizontal wind acceleration.
     */
    //% block="fire $bulletImage as kind $kind from gun $gun to moving target $target speed $speed gravity $gravity barrel length $barrelLength offset $offset degrees lifetime $lifetime ms"
    //% speed.defl=115 gravity.defl=95 barrelLength.defl=19 offset.defl=0 lifetime.defl=3000
    //% group="Target prediction"
    //% weight=100
    //% blockId=ballistics_fire_at_moving_target
    export function fireAtMovingTarget(
        bulletImage: Image,
        kind: number,
        gun: Sprite,
        target: Sprite,
        speed: number,
        gravity: number,
        barrelLength: number,
        offset: number,
        lifetime: number
    ): Sprite {
        return fireSolved(bulletImage, kind, gun, target.x, target.y, target.vx, target.vy,
            speed, gravity, currentWindX, barrelLength, offset, lifetime)
    }


    /**
     * Fire at a moving target using a built-in ammunition preset.
     * If useArtSize is enabled, the projectile image dimensions affect wind response.
     */
    //% block="fire $bulletImage as kind $kind from gun $gun to moving target $target ammo $ammo gravity $gravity barrel length $barrelLength offset $offset degrees use art size $useArtSize lifetime $lifetime ms"
    //% gravity.defl=95 barrelLength.defl=19 offset.defl=0 useArtSize.defl=true lifetime.defl=3000
    //% group="Ammunition"
    //% weight=100
    //% blockId=ballistics_fire_moving_ammo
    export function fireMovingAmmo(
        bulletImage: Image,
        kind: number,
        gun: Sprite,
        target: Sprite,
        ammo: Ammunition,
        gravity: number,
        barrelLength: number,
        offset: number,
        useArtSize: boolean,
        lifetime: number
    ): Sprite {
        const profile = getAmmoProfile(ammo)
        return fireSolved(
            bulletImage, kind, gun,
            target.x, target.y, target.vx, target.vy,
            profile.speed, gravity, currentWindX,
            barrelLength, offset, lifetime,
            profile.mass, useArtSize
        )
    }

    /**
     * Fire at a point using a built-in ammunition preset.
     */
    //% block="fire $bulletImage as kind $kind from gun $gun toward X $targetX Y $targetY ammo $ammo gravity $gravity barrel length $barrelLength offset $offset degrees use art size $useArtSize lifetime $lifetime ms"
    //% gravity.defl=95 barrelLength.defl=19 offset.defl=0 useArtSize.defl=true lifetime.defl=3000
    //% group="Ammunition"
    //% weight=90
    //% blockId=ballistics_fire_point_ammo
    export function firePointAmmo(
        bulletImage: Image,
        kind: number,
        gun: Sprite,
        targetX: number,
        targetY: number,
        ammo: Ammunition,
        gravity: number,
        barrelLength: number,
        offset: number,
        useArtSize: boolean,
        lifetime: number
    ): Sprite {
        const profile = getAmmoProfile(ammo)
        return fireSolved(
            bulletImage, kind, gun,
            targetX, targetY, 0, 0,
            profile.speed, gravity, currentWindX,
            barrelLength, offset, lifetime,
            profile.mass, useArtSize
        )
    }

    /**
     * Fire with a custom muzzle speed and mass. Mass affects wind response;
     * gravity remains mass-independent, as in ordinary projectile motion.
     */
    //% block="fire $bulletImage as kind $kind from gun $gun to moving target $target speed $speed mass $mass gravity $gravity use art size $useArtSize barrel length $barrelLength offset $offset degrees lifetime $lifetime ms"
    //% speed.defl=115 mass.defl=1 gravity.defl=95 useArtSize.defl=true barrelLength.defl=19 offset.defl=0 lifetime.defl=3000
    //% group="Ammunition"
    //% weight=80
    //% blockId=ballistics_fire_custom_mass
    export function fireCustomMass(
        bulletImage: Image,
        kind: number,
        gun: Sprite,
        target: Sprite,
        speed: number,
        mass: number,
        gravity: number,
        useArtSize: boolean,
        barrelLength: number,
        offset: number,
        lifetime: number
    ): Sprite {
        return fireSolved(
            bulletImage, kind, gun,
            target.x, target.y, target.vx, target.vy,
            speed, gravity, currentWindX,
            barrelLength, offset, lifetime,
            mass, useArtSize
        )
    }

    /**
     * Return the preset's mass and speed multiplier.
     */
    function getAmmoProfile(ammo: Ammunition): { mass: number, speed: number } {
        switch (ammo) {
            case Ammunition.Light:
                return { mass: 0.55, speed: 1.2 }
            case Ammunition.Heavy:
                return { mass: 2.4, speed: 0.78 }
            case Ammunition.Precision:
                return { mass: 1.25, speed: 1.1 }
            default:
                return { mass: 1, speed: 1 }
        }
    }

    /**
     * Read the mass value used by a built-in ammunition preset.
     */
    //% block="mass of ammo $ammo"
    //% group="Ammunition"
    //% weight=70
    //% blockId=ballistics_ammo_mass
    export function ammoMass(ammo: Ammunition): number {
        return getAmmoProfile(ammo).mass
    }

    /**
     * Read the speed multiplier used by a built-in ammunition preset.
     */
    //% block="speed multiplier of ammo $ammo"
    //% group="Ammunition"
    //% weight=60
    //% blockId=ballistics_ammo_speed
    export function ammoSpeedMultiplier(ammo: Ammunition): number {
        return getAmmoProfile(ammo).speed
    }

    /**
     * Update projectile stats for a shot by passing speed/gravity to a fire block.
     * This helper returns the speed after applying a percentage upgrade.
     */
    //% block="speed $baseSpeed with speed upgrade $upgradePercent percent"
    //% baseSpeed.defl=115 upgradePercent.defl=10
    //% group="Upgrades"
    //% weight=100
    //% blockId=ballistics_upgrade_speed
    export function upgradedSpeed(baseSpeed: number, upgradePercent: number): number {
        return baseSpeed * (1 + upgradePercent / 100)
    }

    /**
     * Apply a gravity reduction upgrade, never going below the supplied minimum.
     */
    //% block="gravity $baseGravity reduced by $reduction percent minimum $minimumGravity"
    //% baseGravity.defl=95 reduction.defl=20 minimumGravity.defl=10
    //% group="Upgrades"
    //% weight=90
    //% blockId=ballistics_upgrade_gravity
    export function upgradedGravity(baseGravity: number, reduction: number, minimumGravity: number): number {
        const result = baseGravity * (1 - reduction / 100)
        return Math.max(minimumGravity, result)
    }

    // Internal projectile solver. All distances are pixels; velocities are pixels/second.
    function fireSolved(
        bulletImage: Image,
        kind: number,
        gun: Sprite,
        targetX: number,
        targetY: number,
        targetVX: number,
        targetVY: number,
        speed: number,
        gravity: number,
        windX: number,
        barrelLength: number,
        offset: number,
        lifetime: number,
        mass: number = 1,
        useArtSize: boolean = false
    ): Sprite {
        if (speed < 1) speed = 1
        if (mass < 0.05) mass = 0.05
        if (barrelLength < 0) barrelLength = 0

        // Artwork-based cross section: larger images catch more wind.
        // This is a controllable arcade approximation, not real fluid simulation.
        let artFactor = 1
        if (useArtSize) {
            const artArea = Math.max(1, bulletImage.width * bulletImage.height)
            artFactor = Math.sqrt(artArea) / 8
            if (artFactor < 0.25) artFactor = 0.25
            if (artFactor > 4) artFactor = 4
        }

        // Greater mass reduces wind acceleration; larger artwork increases it.
        const effectiveWindX = windX * artFactor / mass
        if (lifetime < 1) lifetime = 1

        // Iteratively solve target lead and muzzle position. Acceleration is
        // included in the displacement equation: p = p0 + v*t + 0.5*a*t^2.
        let flightTime = Math.sqrt(
            (targetX - gun.x) * (targetX - gun.x) +
            (targetY - gun.y) * (targetY - gun.y)
        ) / speed
        if (flightTime < 0.02) flightTime = 0.02

        let launchX = 0
        let launchY = 0
        let angle = Math.atan2(targetY - gun.y, targetX - gun.x) * 180 / Math.PI
        let originX = gun.x
        let originY = gun.y

        for (let iteration = 0; iteration < 20; iteration++) {
            const radians = (angle + offset) * Math.PI / 180
            originX = gun.x + Math.cos(radians) * barrelLength
            originY = gun.y + Math.sin(radians) * barrelLength

            const futureX = targetX + targetVX * flightTime
            const futureY = targetY + targetVY * flightTime

            const requiredX = futureX - originX - 0.5 * effectiveWindX * flightTime * flightTime
            const requiredY = futureY - originY - 0.5 * gravity * flightTime * flightTime

            launchX = requiredX / flightTime
            launchY = requiredY / flightTime
            angle = Math.atan2(launchY, launchX) * 180 / Math.PI

            const requiredSpeed = Math.sqrt(launchX * launchX + launchY * launchY)
            if (requiredSpeed > 0.1) {
                flightTime = flightTime * 0.65 + (flightTime * requiredSpeed / speed) * 0.35
            }
        }

        // Recompute final muzzle and initial velocity with final angle/time.
        const finalRadians = (angle + offset) * Math.PI / 180
        originX = gun.x + Math.cos(finalRadians) * barrelLength
        originY = gun.y + Math.sin(finalRadians) * barrelLength
        const finalTargetX = targetX + targetVX * flightTime
        const finalTargetY = targetY + targetVY * flightTime
        const dx = finalTargetX - originX - 0.5 * effectiveWindX * flightTime * flightTime
        const dy = finalTargetY - originY - 0.5 * gravity * flightTime * flightTime
        const magnitude = Math.sqrt(dx * dx + dy * dy)
        if (magnitude > 0.001) {
            launchX = dx / magnitude * speed
            launchY = dy / magnitude * speed
        } else {
            launchX = speed
            launchY = 0
        }

        lastAngle = Math.atan2(launchY, launchX) * 180 / Math.PI
        lastFlightTime = flightTime

        // Recalculate barrel tip using the actual launch angle.
        const muzzleRadians = (lastAngle + offset) * Math.PI / 180
        originX = gun.x + Math.cos(muzzleRadians) * barrelLength
        originY = gun.y + Math.sin(muzzleRadians) * barrelLength

        const projectile = sprites.create(bulletImage, kind)
        projectile.setPosition(originX, originY)
        projectile.setVelocity(launchX, launchY)
        projectile.ax = effectiveWindX
        projectile.ay = gravity

        control.runInParallel(function () {
            pause(lifetime)
            projectile.destroy()
        })

        return projectile
    }
}
