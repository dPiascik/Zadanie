import React from "react"

interface PlayerProps {
    startInterval: () => void
    pauseInterval: () => void
    restartAnimation: () => void
}

export const PlayerControls = ({
    startInterval,
    pauseInterval,
    restartAnimation
}: PlayerProps) => {
    return (
        <div className="buttons-row">
            <button className="btn-orange" onClick={startInterval}>Start</button>
            <button className="btn-orange" onClick={pauseInterval}>Stop</button>
            <button className="btn-orange" onClick={restartAnimation}>Restart</button>
        </div>
    )
}
