// APP 字符串接收、指令解析、机械臂动作与记忆封装；蓝牙通信由主程序提供。
// XYZ 调用当前机械臂库；回位不更改 XYZ 原点。
namespace Acebott {
    export enum ArmAppSide {
        //% block="left"
        Left = 0,
        //% block="right"
        Right = 1
    }
    export enum ArmAppButton {
        //% block="up"
        Up = 1,
        //% block="down"
        Down = 2,
        //% block="left"
        Left = 3,
        //% block="right"
        Right = 4
    }
    let appMessageHandler: (message: string) => void = null
    let appResults: string[] = []

    let appAdvancedEnabled = false
    let appStarted = false
    let appUpdating = false
    let appAngles = [90, 90, 90, 90]
    let appSliderTargets = [90, 90, 90, 90]
    let appSliderPending = [false, false, false, false]
    let appSliderSpeeds = [100, 100, 100, 100]
    let appLeftButton = 0
    let appRightButton = 0
    let appReceiveBuffer = ""
    let appDiscardFrame = false
    let appCommands: string[] = []
    let appDispatching = false
    let appLastTick = -20
    let appLastSlider = 0
    let appLastLimit = -500
    let appOrder = [0, 2, 1, 3]
    let appPoseAngles = [90, 90, 90, 90]
    let appXYZPending = false
    let appXYZExecuting = false
    let appXYZRevision = 0
    let appXYZCoordinates = [0, 0, 0]

    // 每组顺序存储 C、S、E、G；一个姿态占四个数字。
    let appMemories: number[][] = [[], [], []]
    let appMode = 1
    let appRecording = false
    let appPlaying = false
    let appLoop = false
    let appPoseIndex = 0
    let appPoseStep = 0
    let appPoseStart = [90, 90, 90, 90]
    let appHoldUntil = 0

    function appStatus(text: string): void {
        if (appMessageHandler) {
            // 兼容旧程序的事件方式，避免事件与读取方式重复发送。
            appMessageHandler(text)
        } else {
            // 未读取时最多保留 16 条结果，防止后台回放无限占用内存。
            if (appResults.length >= 16) {
                appResults.shift()
            }
            appResults.push(text)
        }
    }

    function appReadAngles(): void {
        for (let joint = 0; joint < 4; joint++) {
            appAngles[joint] = Acebott.armGetJointAngle(joint)
        }
    }

    function appReportAngles(): void {
        appStatus("ANGLE " + appAngles[0] + " " + appAngles[1] + " " + appAngles[2] + " " + appAngles[3])
    }

    function appClearManual(): void {
        for (let joint = 0; joint < 4; joint++) {
            appSliderPending[joint] = false
        }
    }

    function appStopPlayback(): void {
        appPlaying = false
        appLoop = false
        appPoseIndex = 0
        appPoseStep = 0
    }

    function appCancelXYZ(): void {
        if (appXYZExecuting) {
            Acebott.armCancelPositionMove()
        }
        appXYZPending = false
        appXYZRevision += 1
    }

    function appManualPriority(): void {
        appCancelXYZ()
        if (appPlaying) {
            appStopPlayback()
            serial.writeLine("MEMORY INTERRUPTED BY MANUAL")
        }
    }

    function appWritePose(c: number, s: number, e: number, g: number): boolean {
        if (!(c >= 0 && c <= 180 && s >= 0 && s <= 180 && e >= 0 && e <= 120 && g >= 90 && g <= 180)) {
            return false
        }
        Acebott.armSetPose(c, s, e, g)
        appReadAngles()
        // 这里只检查库接受的目标角，不代表舵机实测位置。
        return appAngles[0] == Math.round(c) && appAngles[1] == Math.round(s) && appAngles[2] == Math.round(e) && appAngles[3] == Math.round(g)
    }

    function appSetJoint(joint: number, angle: number, speed: number = 100): void {
        let minimum = joint == 3 ? 90 : 0
        let maximum = joint == 2 ? 120 : 180
        let target = Math.constrain(Math.round(angle), minimum, maximum)
        if (target != appAngles[joint]) {
            Acebott.armExecuteJoint(joint, target, speed)
            appReadAngles()
            if (appAngles[joint] != target && control.millis() - appLastLimit >= 500) {
                serial.writeLine("LIMIT joint=" + joint + " target=" + target)
                appLastLimit = control.millis()
            }
        }
    }

    function appReset(): void {
        appCancelXYZ()
        appClearManual()
        appStopPlayback()
        // 保留原来的回位顺序，但每次更新只执行一个关节、等待由循环安排。
        // 新的手动或回放指令可取消回位，避免动作争用。
        appResetStep = 0
        appResetting = true
        appResetAt = control.millis()
        appResetReport = false
    }

    let appResetting = false
    let appResetStep = 0
    let appResetAt = 0
    let appResetReport = false

    function appUpdateReset(): void {
        if (control.millis() < appResetAt) {
            return
        }
        appSetJoint(appResetStep, 90)
        appResetStep += 1
        if (appResetStep == 4) {
            appResetting = false
            for (let joint = 0; joint < 4; joint++) {
                appSliderTargets[joint] = appAngles[joint]
            }
            if (appAngles[0] == 90 && appAngles[1] == 90 && appAngles[2] == 90 && appAngles[3] == 90) {
                appStatus("RESET OK")
            } else {
                appStatus("RESET JOINT LIMIT")
            }
            if (appResetReport) {
                appReportAngles()
            }
        } else {
            appResetAt = control.millis() + 100
        }
    }

    function appNumberValid(text: string, integerOnly: boolean): boolean {
        let digits = 0
        let dots = 0
        for (let index = 0; index < text.length; index++) {
            let code = text.charCodeAt(index)
            if (code >= 48 && code <= 57) {
                digits += 1
            } else if (!integerOnly && code == 46) {
                dots += 1
            } else if (!integerOnly && index == 0 && (code == 43 || code == 45)) {
                // 正负号只能出现在第一个字符。
            } else {
                return false
            }
        }
        return digits > 0 && dots <= 1
    }

    function appManualUpdate(): void {
        // 高频滑块指令只保留各关节的最新值，每 120 ms 应用一次。
        if (control.millis() - appLastSlider >= 120) {
            for (let index = 0; index < 4; index++) {
                let joint = appOrder[index]
                if (appSliderPending[joint]) {
                    appSetJoint(joint, appSliderTargets[joint], appSliderSpeeds[joint])
                    appSliderPending[joint] = false
                }
            }
            appLastSlider = control.millis()
        }
    }

    /** Convert APP text to three numbers; actual movement uses armSetPosition. */
    //% blockHidden=true
    //% subcategory="RobotShield"
    export function armAppParseCoordinates(coordinates: string): number[] {
        let normalized = ""
        for (let index = 0; index < coordinates.length; index++) {
            let code = coordinates.charCodeAt(index)
            if (code == 9 || code == 10 || code == 13 || code == 32 || code == 44 || code == 160 || code == 12288 || code == 65292) {
                normalized += " "
            } else {
                normalized += coordinates.charAt(index)
            }
        }
        let raw = normalized.split(" ")
        let parts: string[] = []
        for (let part of raw) {
            if (part.length > 0) {
                parts.push(part)
            }
        }
        if (parts.length != 3 && normalized.length == 9) {
            parts = [normalized.substr(0, 3), normalized.substr(3, 3), normalized.substr(6, 3)]
        }
        if (parts.length != 3) {
            appStatus("XYZ FORMAT ERROR")
            return []
        }
        for (let part of parts) {
            if (!appNumberValid(part, false)) {
                appStatus("XYZ NUMBER ERROR")
                return []
            }
        }
        let x = parseFloat(parts[0])
        let y = parseFloat(parts[1])
        let z = parseFloat(parts[2])
        if (!(x >= -10000 && x <= 10000 && y >= -10000 && y <= 10000 && z >= -10000 && z <= 10000)) {
            appStatus("XYZ NUMBER ERROR")
            return []
        }
        return [x, y, z]
    }

    function appQueuePosition(x: number, y: number, z: number): void {
        appClearManual()
        appManualPriority()
        appResetting = false
        appXYZCoordinates = [x, y, z]
        appXYZPending = true
    }

    function appExecuteXYZ(): void {
        let revision = appXYZRevision
        let x = appXYZCoordinates[0]
        let y = appXYZCoordinates[1]
        let z = appXYZCoordinates[2]
        appXYZPending = false
        appXYZExecuting = true
        Acebott.armExecutePosition(x, y, z)
        appXYZExecuting = false
        appReadAngles()
        // 新的手动、回位、断线或坐标指令已取代本次动作时，不发送过期结果。
        if (revision != appXYZRevision) {
            return
        }
        let result = Acebott.armGetPositionResult()
        if (result == "XYZ OK") {
            for (let joint = 0; joint < 4; joint++) {
                appSliderTargets[joint] = appAngles[joint]
            }
            appStatus("XYZ OK " + x + " " + y + " " + z)
        } else {
            appStatus(result)
        }
        appReportAngles()
    }

    function appStartPlayback(loopMode: boolean): void {
        appCancelXYZ()
        appRecording = false
        appClearManual()
        appStopPlayback()
        appResetting = false
        if (appMemories[appMode - 1].length == 0) {
            appStatus("MEMORY EMPTY")
            return
        }
        appPlaying = true
        appLoop = loopMode
        if (loopMode) {
            appStatus("MEMORY LOOP MODE=" + appMode)
        } else {
            appStatus("MEMORY RUN MODE=" + appMode)
        }
    }

    function appMemory(action: Acebott.ArmMemoryMode): void {
        let bank = appMemories[appMode - 1]
        if (action == Acebott.ArmMemoryMode.StartRecording) {
            appStopPlayback()
            appRecording = true
            appStatus("MEMORY START MODE=" + appMode)
        } else if (action == Acebott.ArmMemoryMode.Save) {
            if (!appRecording) {
                appStatus("MEMORY NOT STARTED")
            } else if (bank.length >= 20 * 4) {
                appStatus("MEMORY FULL")
            } else {
                appReadAngles()
                for (let joint = 0; joint < 4; joint++) {
                    bank.push(appAngles[joint])
                }
                appStatus("MEMORY SAVED MODE=" + appMode + " COUNT=" + bank.length / 4)
            }
        } else if (action == Acebott.ArmMemoryMode.EndRecording) {
            appRecording = false
            appStatus("MEMORY END MODE=" + appMode)
        } else if (action == Acebott.ArmMemoryMode.Run) {
            appStartPlayback(false)
        } else if (action == Acebott.ArmMemoryMode.Delete) {
            appStopPlayback()
            appRecording = false
            appMemories[appMode - 1] = []
            appStatus("MEMORY CLEARED MODE=" + appMode)
        } else if (action == Acebott.ArmMemoryMode.RunLoop) {
            appStartPlayback(true)
        } else if (action == Acebott.ArmMemoryMode.Stop) {
            appCancelXYZ()
            appStopPlayback()
            appClearManual()
            appResetting = false
            appStatus("MEMORY LOOP STOPPED MODE=" + appMode)
        } else {
            appStatus("UNKNOWN COMMAND")
        }
    }

    function appPlaybackUpdate(): void {
        let bank = appMemories[appMode - 1]
        if (appPoseStep == 30) {
            if (control.millis() < appHoldUntil) {
                return
            }
            appReportAngles()
            appPoseIndex += 1
            appPoseStep = 0
            if (appPoseIndex * 4 >= bank.length) {
                if (appLoop) {
                    appPoseIndex = 0
                } else {
                    appPlaying = false
                    appStatus("MEMORY DONE MODE=" + appMode)
                    return
                }
            }
        }
        if (appPoseStep == 0) {
            for (let joint = 0; joint < 4; joint++) {
                appPoseStart[joint] = appAngles[joint]
            }
        }
        for (let joint = 0; joint < 4; joint++) {
            appPoseAngles[joint] = Math.round(appPoseStart[joint] + (bank[appPoseIndex * 4 + joint] - appPoseStart[joint]) * (appPoseStep + 1) / 30)
        }
        if (!appWritePose(appPoseAngles[0], appPoseAngles[1], appPoseAngles[2], appPoseAngles[3])) {
            appPlaying = false
            appLoop = false
            appStatus("MEMORY JOINT LIMIT INDEX=" + appPoseIndex)
            appReportAngles()
            return
        }
        appPoseStep += 1
        if (appPoseStep == 30) {
            // 第 30 步的 20 ms 加上原程序姿态间的 100 ms。
            appHoldUntil = control.millis() + 120
        }
    }

    /** 机械臂产生结果时触发；由主程序决定显示、打印或发送方式。 */
    //% blockId=acebott_arm_app_result block="when robotic arm reports a result"
    //% blockHidden=true
    //% draggableParameters="reporter"
    //% subcategory="RobotShield" group="APP control" weight=84
    export function onArmAppResult(handler: (message: string) => void): void {
        appMessageHandler = handler
        appResults = []
    }

    /** 读取并移除一条待发送的结果；没有新结果时返回空字符串。 */
    //% blockId=acebott_arm_app_read_result block="send APP command verification"
    //% subcategory="RobotShield" group="APP control" weight=84
    export function armAppReadResult(): string {
        if (appResults.length == 0) {
            return ""
        }
        return appResults.shift()
    }

    /** Invalid angle text returns -1 and reports an error. */
    //% blockHidden=true
    //% subcategory="RobotShield"
    export function armAppParseAngle(angleText: string): number {
        if (!appNumberValid(angleText, true)) {
            appStatus("UNKNOWN COMMAND")
            return -1
        }
        let value = parseInt(angleText)
        if (!(value >= 0 && value <= 180)) {
            appStatus("UNKNOWN COMMAND")
            return -1
        }
        return value
    }

    function appQueueJoint(joint: ArmJoint, value: number, speed: number): void {
        if (!(joint >= 0 && joint <= 3) || joint != Math.round(joint) || !(value >= 0 && value <= 180)) {
            appStatus("UNKNOWN COMMAND")
            return
        }
        appReadAngles()
        appManualPriority()
        appResetting = false
        appSliderTargets[joint] = Math.constrain(Math.round(value), joint == 3 ? 90 : 0, joint == 2 ? 120 : 180)
        appSliderSpeeds[joint] = speed
        appSliderPending[joint] = true
    }

    /** 设置机械臂动作状态；先使用初始化机械臂积木设置输出通道。 */
    //% blockHidden=true
    //% subcategory="RobotShield"
    export function armAppPrepare(): void {
        if (!appStarted) {
            appStarted = true
            Acebott.armAttachAppControl(appQueueJoint, appQueuePosition, function () {
                appReset()
                appResetReport = true
            }, function (mode) {
                appReadAngles()
                appMemory(mode)
            })
            appReadAngles()
            // 自动准备只接入调度，不隐式回位或改变关节角度。
            control.inBackground(function () {
                while (true) {
                    armAppUpdate()
                    basic.pause(20)
                }
            })
        }
    }

    /** 开启 APP 的滑块、XYZ、复位和记忆控制；不会自动移动或回位。 */
    //% blockId=acebott_arm_app_open_advanced block="open advanced control on app"
    //% subcategory="RobotShield" group="APP control" weight=86
    export function armAppOpenAdvancedControl(): void {
        appAdvancedEnabled = true
        armAppPrepare()
    }

    /** 查询最后收到的方向键状态；仅判断按键，不自动控制机械臂。 */
    //% blockId=acebott_arm_app_is_pressed block="app %side pad %button button is pressed"
    //% side.defl=Acebott.ArmAppSide.Left
    //% button.defl=Acebott.ArmAppButton.Up
    //% subcategory="RobotShield" group="APP control" weight=82
    export function armAppIsPressed(side: ArmAppSide, button: ArmAppButton): number {
        if (button < ArmAppButton.Up || button > ArmAppButton.Right || button != Math.round(button)) {
            return 0
        }
        if (side == ArmAppSide.Left) {
            return appLeftButton == button ? 1 : 0
        }
        if (side == ArmAppSide.Right) {
            return appRightButton == button ? 1 : 0
        }
        return 0
    }

    function appHandleCommand(command: string): void {
        let commandType = command.substr(0, 2)
        let prefix = command.substr(0, 4)
        if (command.length == 0) {
            // 空指令不会入队；这里表示一条已丢弃的超长帧。
            appStatus("APP FRAME TOO LONG")
        } else if ((commandType == "11" || commandType == "12") && command.length == 4 && command.charAt(2) == "0" && command.charCodeAt(3) >= 48 && command.charCodeAt(3) <= 52) {
            let button = parseInt(command.charAt(3))
            if (commandType == "11") {
                appLeftButton = button
            } else {
                appRightButton = button
            }
        } else if (!appAdvancedEnabled && (commandType == "13" || commandType == "14" || commandType == "15" || commandType == "16" || commandType == "17")) {
            appStatus("APP ADVANCED CONTROL DISABLED")
        } else if (commandType == "13" && (prefix == "1301" || prefix == "1302" || prefix == "1303" || prefix == "1304")) {
            let angle = armAppParseAngle(command.substr(4))
            if (angle >= 0) {
                // 指令 01～04 分别对应夹爪、肘部、肩部、底盘。
                let joint = 4 - parseInt(command.charAt(3))
                Acebott.armSetJoint(joint, angle, 100)
            }
        } else if (prefix == "1401") {
            let coordinates = armAppParseCoordinates(command.substr(4))
            if (coordinates.length == 3) {
                Acebott.armSetPosition(coordinates[0], coordinates[1], coordinates[2])
            }
        } else if (command == "1501") {
            Acebott.armReset()
        } else if (command == "1601") {
            Acebott.armMemory(ArmMemoryMode.StartRecording)
        } else if (command == "1602") {
            Acebott.armMemory(ArmMemoryMode.Save)
        } else if (command == "1603") {
            Acebott.armMemory(ArmMemoryMode.EndRecording)
        } else if (command == "1604") {
            Acebott.armMemory(ArmMemoryMode.Run)
        } else if (command == "1605") {
            Acebott.armMemory(ArmMemoryMode.Delete)
        } else if (command == "1606") {
            Acebott.armMemory(ArmMemoryMode.RunLoop)
        } else if (command == "1607") {
            Acebott.armMemory(ArmMemoryMode.Stop)
        } else if (commandType == "17") {
            if (command == "1701" || command == "1702" || command == "1703") {
                appSelectGroup(parseInt(command.charAt(3)))
                appStatus(command + "1")
            } else {
                appStatus(command + "0")
            }
        } else {
            appStatus("UNKNOWN COMMAND")
        }
    }

    /** 传入保留 # 的蓝牙字符串片段；完整指令依次处理，末尾半条留待下次。 */
    //% blockId=acebott_arm_app_receive block="receive and parse APP data %data"
    //% data.defl="1101#"
    //% subcategory="RobotShield" group="APP control" weight=85
    export function armAppReceive(data: string): void {
        armAppPrepare()
        for (let index = 0; index < data.length; index++) {
            let character = data.charAt(index)
            if (character == "#") {
                if (appDiscardFrame || appReceiveBuffer.length > 0) {
                    appCommands.push(appReceiveBuffer)
                }
                appReceiveBuffer = ""
                appDiscardFrame = false
            } else if (!appDiscardFrame) {
                let code = data.charCodeAt(index)
                if (appReceiveBuffer.length == 0 && (code == 9 || code == 10 || code == 13 || code == 32)) {
                    // 容许指令之间有换行；XYZ 数据内部的分隔符原样保留。
                } else if (appReceiveBuffer.length >= 96) {
                    appReceiveBuffer = ""
                    appDiscardFrame = true
                } else {
                    appReceiveBuffer += character
                }
            }
        }
        // 先收完本次数据，再调用可能等待的结果回调，保持多条指令的先后顺序。
        if (!appDispatching) {
            appDispatching = true
            while (appCommands.length > 0) {
                appHandleCommand(appCommands.shift())
            }
            appDispatching = false
        }
    }

    /** 选择 1、2、3 记忆组，保留其他组数据，停止当前回放和记录。 */
    function appSelectGroup(group: number): void {
        if (!appAdvancedEnabled) {
            appStatus("APP ADVANCED CONTROL DISABLED")
            return
        }
        armAppPrepare()
        if (appStarted && group >= 1 && group <= 3 && group == Math.round(group)) {
            appCancelXYZ()
            appStopPlayback()
            appRecording = false
            appMode = group
        }
    }

    /** 清除待执行的手动输入，停止回放、记录及回位；不清除已保存姿态。 */
    //% blockHidden=true
    //% subcategory="RobotShield"
    export function armAppStop(): void {
        appCancelXYZ()
        appClearManual()
        appStopPlayback()
        appRecording = false
        appResetting = false
        appLeftButton = 0
        appRightButton = 0
        appReceiveBuffer = ""
        appDiscardFrame = false
        appCommands = []
    }

    /** 放在重复执行中，每轮推进滑块、坐标、复位或回放；方向键动作由主程序定义。 */
    //% blockHidden=true
    //% subcategory="RobotShield"
    export function armAppUpdate(): void {
        if (!appStarted || appUpdating || appXYZExecuting || control.millis() - appLastTick < 20) {
            return
        }
        appUpdating = true
        appLastTick = control.millis()
        appReadAngles()
        if (appXYZPending) {
            appExecuteXYZ()
        } else if (appResetting) {
            appUpdateReset()
        } else if (appPlaying) {
            appPlaybackUpdate()
        } else {
            appManualUpdate()
        }
        appUpdating = false
    }
}
