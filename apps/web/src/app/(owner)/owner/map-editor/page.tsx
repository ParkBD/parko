'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, ChevronRight, Loader2, MapPin, Navigation, Save } from 'lucide-react';
import { ParkingMap } from '@/components/features/map/ParkingMap';
import { PolygonDrawer } from '@/components/features/map/PolygonDrawer';
import { PolygonEditor } from '@/components/features/map/PolygonEditor';
import { EntranceExitMarker, LatLng } from '@/components/features/map/EntranceExitMarker';
import { useSaveLotPolygon, useValidatePolygon } from '@/lib/hooks/useGeo';
import { useMyLots } from '@/lib/hooks/useLots';

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { id: 1, label: 'Draw Boundary' },
  { id: 2, label: 'Place Entrances' },
  { id: 3, label: 'Place Exits' },
  { id: 4, label: 'Review & Save' },
];

export default function MapEditorPage() {
  const router = useRouter();
  const { data: lots } = useMyLots();
  const saveMutation = useSaveLotPolygon();
  const validateMutation = useValidatePolygon();

  const [step, setStep] = useState<Step>(1);
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [polygon, setPolygon] = useState<Record<string, any> | null>(null);
  const [entrances, setEntrances] = useState<LatLng[]>([]);
  const [exits, setExits] = useState<LatLng[]>([]);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; reason: string | null } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const center = { lat: 23.8103, lng: 90.4125 };

  const handlePolygonComplete = useCallback(async (geojson: Record<string, any>) => {
    setPolygon(geojson);
    const result = await validateMutation.mutateAsync(geojson);
    setValidationResult(result);
  }, [validateMutation]);

  const handleAddEntrance = useCallback((pt: LatLng) => {
    setEntrances((prev) => [...prev, pt]);
  }, []);

  const handleRemoveEntrance = useCallback((idx: number) => {
    setEntrances((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleAddExit = useCallback((pt: LatLng) => {
    setExits((prev) => [...prev, pt]);
  }, []);

  const handleRemoveExit = useCallback((idx: number) => {
    setExits((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = async () => {
    if (!selectedLotId || !polygon) return;
    setSaveError(null);
    try {
      await saveMutation.mutateAsync({
        lotId: selectedLotId,
        polygon,
        entrances,
        exits,
      });
      router.push('/owner/lots');
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to save. Please try again.');
    }
  };

  const canProceed = () => {
    if (step === 1) return !!polygon && !!selectedLotId;
    if (step === 2) return entrances.length > 0;
    if (step === 3) return exits.length > 0;
    return true;
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex-none px-6 py-4 border-b bg-white shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Parking Lot Map Editor</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Define your parking lot boundary, entrances, and exits on the map.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex-none px-6 py-3 bg-white border-b">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <button
                onClick={() => step > s.id && setStep(s.id as Step)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  step === s.id
                    ? 'bg-indigo-600 text-white'
                    : step > s.id
                    ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {step > s.id ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  <span className="h-4 w-4 rounded-full border-2 border-current text-[10px] flex items-center justify-center font-bold">
                    {s.id}
                  </span>
                )}
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 flex-none bg-white border-r overflow-y-auto p-4 flex flex-col gap-4">
          {/* Lot selector */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Select Parking Lot</label>
            <select
              value={selectedLotId}
              onChange={(e) => setSelectedLotId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— choose a lot —</option>
              {lots?.map((lot: any) => (
                <option key={lot.id} value={lot.id}>{lot.name ?? lot.title}</option>
              ))}
            </select>
          </div>

          {/* Step-specific instructions */}
          {step === 1 && (
            <div className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800">
              <p className="font-semibold mb-1">Step 1: Draw Boundary</p>
              <p>Click the polygon tool in the map toolbar, then click to place points around your lot. Double-click to finish.</p>
              {polygon && (
                <p className="mt-2 font-medium text-green-700">
                  {validationResult?.valid ? '✓ Polygon is valid' : validationResult?.reason ?? 'Validating…'}
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
              <p className="font-semibold mb-1">Step 2: Place Entrances</p>
              <p>Click on the map to place entrance markers (green). Click a marker to remove it.</p>
              <p className="mt-2 font-medium">{entrances.length} entrance(s) placed</p>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              <p className="font-semibold mb-1">Step 3: Place Exits</p>
              <p>Click on the map to place exit markers (red). Click a marker to remove it.</p>
              <p className="mt-2 font-medium">{exits.length} exit(s) placed</p>
            </div>
          )}

          {step === 4 && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              <p className="font-semibold mb-2">Step 4: Review</p>
              <ul className="space-y-1">
                <li>Lot: <span className="font-medium">{((lots as any[])?.find((l) => l.id === selectedLotId) as any)?.name ?? ((lots as any[])?.find((l) => l.id === selectedLotId) as any)?.title ?? '—'}</span></li>
                <li>Polygon: <span className={`font-medium ${polygon ? 'text-green-600' : 'text-red-500'}`}>{polygon ? 'Defined' : 'Missing'}</span></li>
                <li>Entrances: <span className="font-medium">{entrances.length}</span></li>
                <li>Exits: <span className="font-medium">{exits.length}</span></li>
              </ul>
              {saveError && (
                <p className="mt-2 text-red-600 text-xs">{saveError}</p>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-auto flex gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as Step)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                disabled={!canProceed()}
                onClick={() => setStep((s) => (s + 1) as Step)}
                className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                disabled={saveMutation.isPending || !polygon || !selectedLotId}
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </button>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <ParkingMap center={center} zoom={16} height="100%">
            {/* Step 1: Draw or edit polygon */}
            {step === 1 && (
              <PolygonDrawer
                isActive
                onPolygonComplete={handlePolygonComplete}
              />
            )}
            {step > 1 && polygon && (
              <PolygonEditor
                polygon={polygon}
                onChange={setPolygon}
                readonly={step !== 1}
              />
            )}

            {/* Step 2: Entrance markers */}
            {step === 2 && (
              <EntranceExitMarker
                type="entrance"
                points={entrances}
                onAdd={handleAddEntrance}
                onRemove={handleRemoveEntrance}
              />
            )}

            {/* Step 3: Exit markers */}
            {step === 3 && (
              <EntranceExitMarker
                type="exit"
                points={exits}
                onAdd={handleAddExit}
                onRemove={handleRemoveExit}
              />
            )}

            {/* Step 4: Show all, read-only */}
            {step === 4 && polygon && (
              <PolygonEditor polygon={polygon} onChange={setPolygon} readonly />
            )}
            {step === 4 && entrances.map((pt, i) => (
              <EntranceExitMarker
                key={`ent-review-${i}`}
                type="entrance"
                points={[pt]}
                onAdd={() => {}}
                onRemove={() => {}}
              />
            ))}
            {step === 4 && exits.map((pt, i) => (
              <EntranceExitMarker
                key={`exit-review-${i}`}
                type="exit"
                points={[pt]}
                onAdd={() => {}}
                onRemove={() => {}}
              />
            ))}
          </ParkingMap>
        </div>
      </div>
    </div>
  );
}
