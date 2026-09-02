import React from 'react';
import { SCENARIOS } from '../../data/scenarios';
import { useUIStore } from '../../store/uiStore';
import { useSimulationStore } from '../../store/simulationStore';
import { ScenarioId } from '../../types/simulation';
import { Layers } from 'lucide-react';

export const ScenarioSelector: React.FC = () => {
  const { currentScenarioId, setScenario } = useUIStore();
  const { resetSimulation } = useSimulationStore();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value as ScenarioId;
    setScenario(newId);
    resetSimulation(newId);
  };

  return (
    <div className="flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
      <Layers className="w-4 h-4 text-teal-400 shrink-0" />
      <span className="text-slate-400 font-mono text-[10px] uppercase hidden sm:inline">Scenario:</span>
      <select
        value={currentScenarioId}
        onChange={handleChange}
        className="bg-transparent text-slate-100 font-semibold focus:outline-none cursor-pointer max-w-[200px] truncate"
      >
        {SCENARIOS.map((s) => (
          <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
            {s.title}
          </option>
        ))}
      </select>
    </div>
  );
};
