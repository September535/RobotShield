// 独立 XYZ 节奏对照：不改库，仅支持下表的六个固定点。
// 角度来自当前库原始坐标系的计算结果；不要调用 armReset 改变原点。
// 保留原来的关节空间直线插值；最大变化轴每步最多 2°，每步等待 120ms。
// 其他轴按比例变化，取整后为 0～2°，不是每个轴强制走 2°。
function testXYZ (x: number, y: number, z: number): boolean {
    let target: number[] = []
    if (x == 7 && y == 13 && z == 2) {
        target = [69, 29, 68]
    } else if (x == 7 && y == 13 && z == 0) {
        target = [68, 19, 56]
    } else if (x == 7 && y == 13 && z == 15) {
        target = [68, 62, 62]
    } else if (x == -7 && y == 13 && z == 15) {
        target = [111, 62, 62]
    } else if (x == -7 && y == 13 && z == 0) {
        target = [111, 19, 56]
    } else if (x == -8 && y == 13.5 && z == 4.5) {
        target = [113, 27, 65]
    } else {
        serial.writeLine("TEST: unsupported XYZ point")
        return false
    }
    serial.writeLine("TEST XYZ " + x + "," + y + "," + z)
    let startC = Acebott.armGetJointAngle(Acebott.ArmJoint.Chassis)
    let startS = Acebott.armGetJointAngle(Acebott.ArmJoint.Shoulder)
    let startE = Acebott.armGetJointAngle(Acebott.ArmJoint.Elbow)
    let g = Acebott.armGetJointAngle(Acebott.ArmJoint.Claws)
    let delta = Math.max(Math.abs(target[0] - startC), Math.max(Math.abs(target[1] - startS), Math.abs(target[2] - startE)))
    let steps = Math.ceil(delta / 2)
    for (let step = 1; step <= steps; step++) {
        let c = Math.round(startC + (target[0] - startC) * step / steps)
        let s = Math.round(startS + (target[1] - startS) * step / steps)
        let e = Math.round(startE + (target[2] - startE) * step / steps)
        Acebott.armSetPose(c, s, e, g)
        // 库保留肩肘限位。若拒绝本步，停止测试，不跳过后继续运动。
        if (Acebott.armGetJointAngle(Acebott.ArmJoint.Chassis) != c ||
            Acebott.armGetJointAngle(Acebott.ArmJoint.Shoulder) != s ||
            Acebott.armGetJointAngle(Acebott.ArmJoint.Elbow) != e ||
            Acebott.armGetJointAngle(Acebott.ArmJoint.Claws) != g) {
            serial.writeLine("TEST STOP: pose rejected")
            return false
        }
        basic.pause(120)
    }
    return true
}

// 抖动对照案例：保留原坐标，回位前改为慢速，之后不恢复 Fast。
function Init () {
    transportCount = 2
    pickX = 7
    pickY = 13
    pickZ = 2
    placeX = -7
    placeY = 13
    placeZ = 0
    liftHeight = 15
    Acebott.armInitialize(Acebott.ArmOutputChannel.STC0, Acebott.ArmOutputChannel.STC1, Acebott.ArmOutputChannel.STC2, Acebott.ArmOutputChannel.STC3)
    Acebott.armSetSpeed(Acebott.ArmSpeed.Fast)
    basic.pause(500)
}
let placeZ = 0
let placeY = 0
let placeX = 0
let liftHeight = 0
let pickZ = 0
let pickY = 0
let pickX = 0
let transportCount = 0
Init()
for (let cycle = 0; cycle <= transportCount - 1; cycle++) {
    basic.showNumber(cycle + 1)
    Acebott.armClaw(Acebott.ArmClawState.Open)
    basic.pause(1000)
    if (!testXYZ(pickX, pickY, pickZ - cycle * 2)) {
        break
    }
    basic.pause(500)
    Acebott.armClaw(Acebott.ArmClawState.Close)
    basic.pause(500)
    if (!testXYZ(pickX, pickY, liftHeight)) {
        break
    }
    basic.pause(500)
    // Use the same upper waypoint for both transport cycles.
    if (!testXYZ(placeX, placeY, liftHeight)) {
        break
    }
    basic.pause(500)
    if (!testXYZ(placeX - cycle, placeY + cycle * 0.5, placeZ + cycle * 4.5)) {
        break
    }
    basic.pause(500)
    Acebott.armClaw(Acebott.ArmClawState.Open)
    basic.pause(500)
    if (!testXYZ(placeX, placeY, liftHeight)) {
        break
    }
    basic.pause(500)
    // 第二轮的夹爪开合也保持慢速，先验证回位和起停速度。
    Acebott.armSetSpeed(Acebott.ArmSpeed.Slow)
    Acebott.armHomePose()
    basic.pause(500)
}
