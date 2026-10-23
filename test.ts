// Compile-only coverage. These functions are not called at startup.
function testRoboticArmApi(): void {
    Acebott.armInitialize(Acebott.ArmOutputChannel.STC0, Acebott.ArmOutputChannel.STC1, Acebott.ArmOutputChannel.STC2, Acebott.ArmOutputChannel.STC3)
    Acebott.armSetSpeed(Acebott.ArmSpeed.Slow)
    Acebott.armSetJoint(Acebott.ArmJoint.Chassis, 90, 50)
    Acebott.armSetPose(90, 90, 90, 90)
    Acebott.armClaw(Acebott.ArmClawState.Open)
    Acebott.armHomePose()
    Acebott.armReset()
    Acebott.armSetPosition(0, 12, 15)
    let x = Acebott.armGetCoordinate(Acebott.ArmCoordinateAxis.X)
    let chassis = Acebott.armGetJointAngle(Acebott.ArmJoint.Chassis)
    Acebott.armMemory(Acebott.ArmMemoryMode.Save)
    Acebott.armMemory(Acebott.ArmMemoryMode.Run)
    Acebott.armMemory(Acebott.ArmMemoryMode.Delete)
}

function testArmControllerApi(): void {
    Acebott.stcServoAngle(0, 90)
    Acebott.i2cAddressRead()
    let address = Acebott.i2cAddressCheck("0x37")
    let stc = Acebott.stcI2cCheck()
}

function testArmAppApi(): void {
    Acebott.onArmAppResult(function (message: string) { serial.writeLine(message) })
    Acebott.armAppPrepare()
    let angle = Acebott.armAppParseAngle("90")
    let xyz = Acebott.armAppParseCoordinates("7 13 2")
    Acebott.armAppReceive("11")
    let pressed = Acebott.armAppIsPressed(Acebott.ArmAppSide.Left, Acebott.ArmAppButton.Up)
    Acebott.armSetJoint(Acebott.ArmJoint.Claws, angle, 100)
    Acebott.armSetPosition(xyz[0], xyz[1], xyz[2])
    Acebott.armMemory(Acebott.ArmMemoryMode.StartRecording)
    Acebott.armMemory(Acebott.ArmMemoryMode.Save)
    Acebott.armMemory(Acebott.ArmMemoryMode.EndRecording)
    Acebott.armMemory(Acebott.ArmMemoryMode.RunLoop)
    Acebott.armMemory(Acebott.ArmMemoryMode.Stop)
    Acebott.armAppUpdate()
    Acebott.armAppStop()
}
