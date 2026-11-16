import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Building, Search, Home, Users } from 'lucide-react';

export const UnitDirectory = () => {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [buildings, setBuildings] = useState([]);

  useEffect(() => {
    const fetchBuildingsAndUnits = async () => {
      try {
        const bRes = await api.get('/societies/buildings');
        if (bRes.success) setBuildings(bRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchBuildingsAndUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      let url = '/societies/apartments?limit=120&';
      if (selectedBuilding) url += `buildingId=${selectedBuilding}&`;
      if (searchTerm) url += `search=${searchTerm}&`;
      const res = await api.get(url);
      if (res.success) setApartments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, [selectedBuilding, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Residential Apartments & Wings Directory</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Overview of all 56 apartment units across Emerald Wing A and Sapphire Wing B (14 floors × 2 units each)
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by unit number (e.g. A-102)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        <select
          value={selectedBuilding}
          onChange={(e) => setSelectedBuilding(e.target.value)}
          className="input-field sm:w-56"
        >
          <option value="">All Wings (A, B)</option>
          {buildings.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner text="Retrieving society units..." />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] border-b border-slate-700/80">
                <tr>
                  <th className="px-5 py-3.5">Unit #</th>
                  <th className="px-5 py-3.5">Wing</th>
                  <th className="px-5 py-3.5">Floor</th>
                  <th className="px-5 py-3.5">Config</th>
                  <th className="px-5 py-3.5">Area (Sq Ft)</th>
                  <th className="px-5 py-3.5">Occupant / Owner</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {apartments.map((apt) => (
                  <tr key={apt._id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-teal-400">
                      {apt.unitNumber}
                    </td>
                    <td className="px-5 py-3 text-slate-300 font-medium">
                      {apt.buildingId?.name || 'Wing'}
                    </td>
                    <td className="px-5 py-3 text-slate-400">Floor {apt.floorNumber}</td>
                    <td className="px-5 py-3 font-semibold text-slate-200">{apt.type}</td>
                    <td className="px-5 py-3 font-mono text-slate-400">{apt.areaSqFt} sq.ft</td>
                    <td className="px-5 py-3">
                      {apt.ownerId ? (
                        <div>
                          <p className="font-semibold text-slate-200">{apt.ownerId.name}</p>
                          <p className="text-[10px] text-slate-500">{apt.ownerId.phone}</p>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={apt.status === 'OCCUPIED' ? 'APPROVED' : 'PENDING'}>
                        {apt.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
