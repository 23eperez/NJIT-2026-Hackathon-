import React, { useState, useEffect, useRef } from 'react';
import './TimeDisplay.css';

interface TimeData {
    iso: string;
    est: string;
    timestamp: number;
    timezone: string;
}

interface TimelineEntry {
    id: string;
    time: string;
    timestamp: number;
    isNow: boolean;
}

interface TimeDisplayProps {
    elapsedSeconds: number;
    isSimulating: boolean;
}

const API_BASE_URL = 'http://localhost:3001';

export const TimeDisplay: React.FC<TimeDisplayProps> = ({
    elapsedSeconds,
    isSimulating,
}) => {
    const [timeData, setTimeData] = useState<TimeData | null>(null);
    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
    const [scrollPosition, setScrollPosition] = useState(0);
    const timelineRef = useRef<HTMLDivElement>(null);
    const timelineContainerRef = useRef<HTMLDivElement>(null);

    // Fetch current EST time
    useEffect(() => {
        const fetchTime = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/time`);
                if (response.ok) {
                    const data = await response.json();
                    setTimeData(data);
                }
            } catch (error) {
                console.error('Failed to fetch time:', error);
            }
        };

        fetchTime();
        const interval = setInterval(fetchTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // Generate timeline entries (one per minute, showing 30 minutes past to 30 future)
    useEffect(() => {
        if (!timeData) return;

        const now = new Date(timeData.timestamp);
        const entries: TimelineEntry[] = [];

        // Generate entries from -30 to +30 minutes
        for (let i = -30; i <= 30; i++) {
            const entryTime = new Date(now.getTime() + i * 60000);
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/New_York',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
            const formatted = formatter.format(entryTime);

            entries.push({
                id: `${entryTime.getTime()}`,
                time: formatted,
                timestamp: entryTime.getTime(),
                isNow: i === 0,
            });
        }

        setTimeline(entries);

        // Auto-scroll to current time
        if (timelineContainerRef.current) {
            const scrollTo = Math.max(0, (entries.length / 2 - 2) * 80);
            timelineContainerRef.current.scrollLeft = scrollTo;
            setScrollPosition(scrollTo);
        }
    }, [timeData]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        setScrollPosition(container.scrollLeft);
    };

    if (!timeData) {
        return (
            <div className="time-display loading">
                <span>Loading time...</span>
            </div>
        );
    }

    return (
        <div className="time-display">
            <div className="time-info">
                <div className="time-current">
                    <div className="time-label">EST Time:</div>
                    <div className="time-value">{timeData.est}</div>
                    <div className="time-iso">{timeData.iso}</div>
                </div>
                {elapsedSeconds > 0 && (
                    <div className="simulation-elapsed">
                        <div className="time-label">Simulation:</div>
                        <div className="time-value">
                            T+{String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:
                            {String(elapsedSeconds % 60).padStart(2, '0')}
                        </div>
                        <div className="sim-status">{isSimulating ? '🟢 LIVE' : '⏸️ PAUSED'}</div>
                    </div>
                )}
            </div>

            <div className="timeline-container" ref={timelineContainerRef} onScroll={handleScroll}>
                <div className="timeline" ref={timelineRef}>
                    {timeline.map((entry) => (
                        <div
                            key={entry.id}
                            className={`timeline-entry ${entry.isNow ? 'now' : ''}`}
                            title={new Date(entry.timestamp).toLocaleString('en-US', {
                                timeZone: 'America/New_York',
                            })}
                        >
                            <div className="timeline-tick" />
                            <div className="timeline-label">{entry.time}</div>
                        </div>
                    ))}
                </div>
                <div className="timeline-pointer">
                    <div className="pointer-indicator">▼</div>
                </div>
            </div>
        </div>
    );
};
