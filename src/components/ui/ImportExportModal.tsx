
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Button } from './Button';
import { Upload, Download, FileSpreadsheet, FileJson, FileText, CheckCircle, Loader2 } from 'lucide-react';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'import' | 'export';
  entityName: string; // e.g., "Customers", "Orders"
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({ isOpen, onClose, type, entityName }) => {
  const [step, setStep] = useState<'select' | 'processing' | 'done'>('select');
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState('csv');

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setProgress(0);
    }
  }, [isOpen]);

  const handleProcess = () => {
    setStep('processing');
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 20;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => setStep('done'), 500);
      }
      setProgress(Math.min(p, 100));
    }, 300);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => setStep('select'), 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#262626] border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            {type === 'import' ? <Upload size={20} className="text-brand-primary"/> : <Download size={20} className="text-brand-primary"/>}
            {type === 'import' ? `Import ${entityName}` : `Export ${entityName}`}
          </DialogTitle>
          <DialogDescription>
            {type === 'import' 
              ? `Upload a CSV or JSON file to import ${entityName.toLowerCase()}.` 
              : `Choose a format to download your ${entityName.toLowerCase()} data.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'select' && (
            <div className="space-y-4">
              {type === 'import' ? (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" onClick={handleProcess}>
                  <div className="w-12 h-12 bg-brand-light rounded-full flex items-center justify-center mb-3 text-brand-primary">
                    <Upload size={24} />
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload file</p>
                  <p className="text-xs text-gray-500">CSV, JSON or Excel (max 50MB)</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {['csv', 'json', 'pdf'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setFormat(fmt)}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        format === fmt 
                          ? 'border-brand-primary bg-brand-light/30' 
                          : 'border-gray-100 dark:border-gray-700 hover:border-brand-primary/50'
                      }`}
                    >
                      {fmt === 'csv' && <FileSpreadsheet size={24} className="mb-2 text-green-600"/>}
                      {fmt === 'json' && <FileJson size={24} className="mb-2 text-orange-600"/>}
                      {fmt === 'pdf' && <FileText size={24} className="mb-2 text-red-600"/>}
                      <span className="text-xs font-bold uppercase">{fmt.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'processing' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto relative">
                <Loader2 size={64} className="text-brand-light animate-spin" />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-brand-primary">
                  {Math.round(progress)}%
                </span>
              </div>
              <p className="text-sm text-gray-500 animate-pulse">Processing data...</p>
            </div>
          )}

          {step === 'done' && (
            <div className="py-6 text-center space-y-3">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-in zoom-in">
                <CheckCircle size={32} />
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">Success!</h4>
              <p className="text-sm text-gray-500">
                {type === 'import' 
                  ? `Successfully imported ${entityName}.` 
                  : `Your ${format.toUpperCase()} file is ready.`}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          {step === 'select' ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              {type === 'export' && <Button onClick={handleProcess}>Export Now</Button>}
            </>
          ) : step === 'processing' ? (
            <Button disabled>Please wait...</Button>
          ) : (
            <Button onClick={handleClose}>
                {type === 'export' ? 'Download File' : 'Done'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
