import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useDocumentStore } from '../../../store/documentStore';
import { FileText, Plus, Trash2, UploadCloud } from 'lucide-react';
import DocumentViewer from '../../../components/ui/DocumentViewer';
import { format } from 'date-fns';

export default function DocumentsPage() {
  const { trip } = useOutletContext();
  const { documents, subscribeToDocuments, addDocument, deleteDocument, isLoading } = useDocumentStore();
  const [isUploading, setIsUploading] = useState(false);
  
  const [viewerUrl, setViewerUrl] = useState(null);
  const [viewerName, setViewerName] = useState('');

  useEffect(() => {
    if (trip?.id) {
      const unsubscribe = subscribeToDocuments(trip.id);
      return () => unsubscribe && unsubscribe();
    }
  }, [trip?.id, subscribeToDocuments]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isFakeDriveFile = 
      file.name.endsWith('.gdoc') || file.name.endsWith('.desktop') || 
      file.name.endsWith('.url') || file.name.endsWith('.gsheet') ||
      file.size === 0 || (!file.name.includes('.') && file.type === '');

    if (isFakeDriveFile) {
      alert(`Error con "${file.name}": El sistema nos indica que este archivo está vacío o es un "enlace de nube" (como Google Drive), no el documento real.\n\nPor favor, descarga el archivo directamente desde tu navegador a tu dispositivo e inténtalo de nuevo para asegurar que esté disponible sin conexión.`);
      e.target.value = ''; // reset
      return;
    }

    setIsUploading(true);
    try {
      await addDocument(trip.id, file.name, file);
    } catch (err) {
      alert("Error subiendo documento: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId, e) => {
    e.stopPropagation();
    if (confirm("¿Eliminar este documento personal?")) {
      await deleteDocument(trip.id, docId);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Documentos Personales</h2>
          <p className="text-slate-400 text-sm">Pasaportes, ESTA, visados y certificados para el viaje.</p>
        </div>
        <label className="bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 border border-teal-500/30 font-medium py-2 px-4 rounded-xl transition-all flex items-center gap-2 shadow-lg cursor-pointer">
          <UploadCloud className="w-4 h-4" />
          <span>{isUploading ? 'Subiendo...' : 'Subir Documento'}</span>
          <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
        </label>
      </div>

      {isLoading && documents.length === 0 ? (
        <div className="text-slate-400 text-center py-10 animate-pulse">Cargando documentos...</div>
      ) : documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div 
              key={doc.id}
              onClick={() => { setViewerUrl(doc.url); setViewerName(doc.title); }}
              className="bg-slate-900 border border-slate-700 hover:border-teal-500/50 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-colors group shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="p-3 bg-slate-800 rounded-xl text-teal-400 group-hover:bg-teal-500/20 transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate" title={doc.title}>{doc.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {doc.createdAt?.toDate ? format(doc.createdAt.toDate(), 'dd MMM yyyy, HH:mm') : 'Reciente'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button 
                  onClick={(e) => handleDelete(doc.id, e)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Eliminar documento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-700">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">No tienes documentos personales subidos para este viaje.</p>
        </div>
      )}

      <DocumentViewer 
        url={viewerUrl} 
        name={viewerName} 
        isOpen={!!viewerUrl} 
        onClose={() => setViewerUrl(null)} 
      />
    </div>
  );
}
