// DbPanel.tsx
import React from "react"
import { PositionData } from "../Models"

interface Props {
    dbPoints: PositionData[]
    filterInside: boolean | null
    setFilterInside: React.Dispatch<React.SetStateAction<boolean | null>>
    sortField: 'id' | 'latitude' | 'longitude' | 'isInsidePolygon' | 'exitTime'
    sortAsc: boolean
    handleSort: (field: 'id' | 'latitude' | 'longitude' | 'isInsidePolygon' | 'exitTime') => void
}

export const DbPanel = ({
    dbPoints,
    filterInside,
    setFilterInside,
    sortField,
    sortAsc,
    handleSort
}: Props) => {

    return (
        <div className='filter-panel'>
            <div className="filter-row">
                <label htmlFor="filter-select" className="filter-label">Pokaż punkty:</label>
                <select
                    id="filter-select"
                    value={filterInside === null ? 'all' : filterInside ? 'true' : 'false'}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'all') setFilterInside(null);
                        else setFilterInside(val === 'true');
                    }}
                >
                    <option value="all">Wszystkie</option>
                    <option value="true">W torze</option>
                    <option value="false">Poza torem</option>
                </select>
            </div>

            <div className='table-scroll'>
                <table className="db-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('id')} className="sortable">ID {sortField === 'id' ? (sortAsc ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('latitude')} className="sortable">Latitude {sortField === 'latitude' ? (sortAsc ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('longitude')} className="sortable">Longitude {sortField === 'longitude' ? (sortAsc ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('isInsidePolygon')} className="sortable">Tor {sortField === 'isInsidePolygon' ? (sortAsc ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('exitTime')} className="sortable">Exit Time {sortField === 'exitTime' ? (sortAsc ? '↑' : '↓') : ''}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dbPoints.map(p => (
                            <tr key={p.id}>
                                <td>{p.id}</td>
                                <td>{p.latitude}</td>
                                <td>{p.longitude}</td>
                                <td>{p.isInsidePolygon ? 'Tak' : 'Nie'}</td>
                                <td>{new Date(p.exitTime).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
