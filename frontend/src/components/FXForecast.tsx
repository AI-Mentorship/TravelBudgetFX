import { useState, useEffect, useMemo } from 'react'
import { getCurrencyForecast, type ForecastData } from '../services/api'
import './FXForecast.css'

interface FXForecastProps {
    baseCurrency: string
    targetCurrency: string
    visible: boolean
}

export default function FXForecast({ baseCurrency, targetCurrency, visible }: FXForecastProps) {
    const [data, setData] = useState<ForecastData[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (visible && baseCurrency && targetCurrency) {
            fetchForecast()
        }
    }, [visible, baseCurrency, targetCurrency])

    const fetchForecast = async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await getCurrencyForecast({
                base_currency: baseCurrency,
                target_currency: targetCurrency,
                days: 30
            })
            setData(result)
        } catch (err) {
            setError('Failed to load forecast data')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const { points, areaPath, minRate, maxRate, bestDay, currentRate, trend, avgRate } = useMemo(() => {
        if (data.length === 0) return { points: '', areaPath: '', minRate: 0, maxRate: 0, bestDay: null, currentRate: 0, trend: 0, avgRate: 0 }

        const rates = data.map(d => d.rate)
        const min = Math.min(...rates)
        const max = Math.max(...rates)
        const range = max - min || 1 // Avoid division by zero
        const currentRate = rates[0]
        const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length
        const trend = ((rates[rates.length - 1] - rates[0]) / rates[0]) * 100

        // Find best day (highest rate)
        const bestRate = Math.max(...rates)
        const bestDayIndex = rates.indexOf(bestRate)
        const bestDay = data[bestDayIndex]

        const width = 100 // ViewBox width
        const height = 50 // ViewBox height
        const padding = 5

        const pointsArray = data.map((d, i) => {
            const x = (i / (data.length - 1)) * (width - padding * 2) + padding
            // Invert Y because SVG 0 is top
            const normalizedRate = (d.rate - min) / range
            const y = height - padding - (normalizedRate * (height - padding * 2))
            return `${x},${y}`
        })

        const pointsStr = pointsArray.join(' ')

        // Create area path (closed shape)
        const firstPoint = pointsArray[0]
        const lastPoint = pointsArray[pointsArray.length - 1]
        const areaPathStr = `M ${firstPoint} L ${pointsStr} L ${lastPoint.split(',')[0]},${height} L ${firstPoint.split(',')[0]},${height} Z`

        return {
            points: pointsStr,
            areaPath: areaPathStr,
            minRate: min,
            maxRate: max,
            bestDay,
            currentRate,
            trend,
            avgRate
        }
    }, [data])

    if (!visible) return null

    return (
        <div className="fx-forecast-container">
            <div className="fx-forecast-header">
                <h3>AI Currency Forecast</h3>
                <p>Projected {baseCurrency}/{targetCurrency} exchange rates for the next 30 days</p>
            </div>

            {loading ? (
                <div className="loading-spinner">Generating forecast model...</div>
            ) : error ? (
                <div className="error-message">{error}</div>
            ) : (
                <>
                    <div className="forecast-stats">
                        <div className="stat-item">
                            <span className="stat-label">Current Rate</span>
                            <span className="stat-value">{currentRate.toFixed(4)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">30-Day Trend</span>
                            <span className={`stat-value ${trend >= 0 ? 'positive' : 'negative'}`}>
                                {trend >= 0 ? '↗' : '↘'} {Math.abs(trend).toFixed(2)}%
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Average Rate</span>
                            <span className="stat-value">{avgRate.toFixed(4)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Range</span>
                            <span className="stat-value">{minRate.toFixed(4)} - {maxRate.toFixed(4)}</span>
                        </div>
                    </div>
                    <div className="chart-container">
                        <svg className="chart-svg" viewBox="0 0 100 50" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#4facfe" stopOpacity="0.5" />
                                    <stop offset="100%" stopColor="#4facfe" stopOpacity="0" />
                                </linearGradient>
                            </defs>

                            {/* Grid lines */}
                            <line x1="0" y1="5" x2="100" y2="5" className="chart-grid-line" />
                            <line x1="0" y1="25" x2="100" y2="25" className="chart-grid-line" />
                            <line x1="0" y1="45" x2="100" y2="45" className="chart-grid-line" />

                            <path d={areaPath} className="chart-area" />
                            <polyline points={points} className="chart-line" />

                            {/* Y-axis labels */}
                            <text x="1" y="6" className="chart-axis-text">{maxRate.toFixed(2)}</text>
                            <text x="1" y="26" className="chart-axis-text">{((maxRate + minRate) / 2).toFixed(2)}</text>
                            <text x="1" y="46" className="chart-axis-text">{minRate.toFixed(2)}</text>
                            
                            {/* X-axis date labels */}
                            <text x="5" y="52" className="chart-date-text">Today</text>
                            <text x="47" y="52" className="chart-date-text" textAnchor="middle">Day 15</text>
                            <text x="93" y="52" className="chart-date-text" textAnchor="end">Day 30</text>
                        </svg>
                    </div>

                    {bestDay && (
                        <div className="recommendation-card">
                            <div className="recommendation-icon">💡</div>
                            <div className="recommendation-content">
                                <h4>Smart Recommendation</h4>
                                <p>
                                    Based on our AI model, the best time to exchange your money is on{' '}
                                    <span className="highlight-rate">{new Date(bestDay.date).toLocaleDateString()}</span>{' '}
                                    when the rate is projected to be <span className="highlight-rate">{bestDay.rate.toFixed(4)}</span>.
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
