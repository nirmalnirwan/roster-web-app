'use client';

import { useEffect, useState } from 'react';
import useRequireAuth from '../hooks/useRequireAuth';
import { Roster } from '../../lib/types';
import { getRosters, exportRosterPdf, exportRosterExcel } from '../services/rosterService';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { FileText, Download } from 'lucide-react';

export default function ExportPage() {
  useRequireAuth();
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getRosters();
        setRosters(data);
      } catch (error) {
        console.error('Failed to load rosters', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleExportPdf(rosterId: number) {
    setExporting(rosterId);
    try {
      const blob = await exportRosterPdf(rosterId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roster_${rosterId}.pdf`;
      a.click();
    } finally {
      setExporting(null);
    }
  }

  async function handleExportExcel(rosterId: number) {
    setExporting(rosterId);
    try {
      const blob = await exportRosterExcel(rosterId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roster_${rosterId}.xlsx`;
      a.click();
    } finally {
      setExporting(null);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading rosters...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Export Rosters</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Download rosters as PDF or Excel for distribution
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rosters.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">No rosters available</p>
          </div>
        ) : (
          rosters.map(r => (
            <Card key={r.id} className="hover:shadow-md transition">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Week of {new Date(r.weekStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Housekeeper</div>
                  <div className="text-sm font-medium">{r.housekeeperName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Tasks</div>
                  <div className="text-2xl font-bold">{r.rosterTasks.length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Created</div>
                  <div className="text-sm">{new Date(r.createdDate).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleExportPdf(r.id)}
                    disabled={exporting === r.id}
                    className="flex-1 bg-red-500 hover:bg-red-600"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button
                    onClick={() => handleExportExcel(r.id)}
                    disabled={exporting === r.id}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
