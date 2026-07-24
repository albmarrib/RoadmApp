import { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../../../store/documentStore';
import { useItineraryStore } from '../../../store/itineraryStore';
import { FileText, Plus, Trash2, UploadCloud, Sparkles, Loader2, Plane, UserSquare2 } from 'lucide-react';
import DocumentViewer from '../../../components/ui/DocumentViewer';
import { format } from 'date-fns';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../../config/firebase';
import { Timestamp } from 'firebase/firestore';

export default function DocumentsPage() {
  const { trip } = useOutletContext();
  const navigate = useNavigate();
  const { documents, subscribeToDocuments, addDocument, deleteDocument, updateDocument, isLoading } = useDocumentStore();
  const { addNode } = useItineraryStore();
  
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'personal'
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(null); 
  
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
      alert(`Error con "${file.name}": El sistema nos indica que este archivo está vacío o es un enlace. Sube el documento real.`);
      e.target.value = ''; 
      return;
    }

    setIsUploading(true);
    try {
      await addDocument(trip.id, file.name, file, activeTab);
    } catch (err) {
      alert("Error subiendo documento: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async (docId, url, e) => {
    e.stopPropagation();
    setIsAnalyzing(docId);
    
    try {
      const functions = getFunctions(app, 'europe-west1');
      const analyzeDocument = httpsCallable(functions, 'analyzeDocument');
      
      const result = await analyzeDocument({ fileUrl: url, mimeType: 'application/pdf' });
      
      if (result.data.success && result.data.data) {
        let events = Array.isArray(result.data.data) ? result.data.data : [result.data.data];
        
        for (const ev of events) {
          const nodeData = {
            type: ev.type || 'activity',
            title: ev.title || 'Evento Importado',
            startTime: ev.startTime ? Timestamp.fromDate(new Date(ev.startTime)) : Timestamp.now(),
            endTime: ev.endTime ? Timestamp.fromDate(new Date(ev.endTime)) : null,
            cost: ev.cost ? parseFloat(ev.cost) : 0,
            currency: ev.currency || 'EUR',
            notes: ev.details || '',
            isAIImported: true
          };
          
          if (ev.location) {
            nodeData.location = {
              name: ev.location.name || 'Lugar desconocido'
            };
          }
          
          await addNode(trip.id, nodeData);
        }
        
        await updateDocument(trip.id, docId, { aiAnalyzed: true });
        
        alert(`¡Éxito! Se han creado ${events.length} eventos en tu itinerario.`);
        navigate(`/trip/${trip.id}/itinerary`);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error al procesar el documento con IA.');
    } finally {
      setIsAnalyzing(null);
    }
  };

  const handleDelete = async (docId, e) => {
    e.stopPropagation();
    if (confirm("¿Eliminar este documento?")) {
      await deleteDocument(trip.id, docId);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const docType = doc.type || 'personal'; // Compatibilidad hacia atrás
    return docType === activeTab;
  });

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Documentos</h2>
          <p className="text-slate-400 text-sm">Gestiona tus reservas y documentos personales.</p>
        </div>
        <label className="bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 border border-teal-500/30 font-bold py-2 px-4 rounded-xl transition-all flex items-center gap-2 shadow-lg cursor-pointer">
          <UploadCloud className="w-4 h-4" />
          <span>{isUploading ? 'Subiendo...' : 'Subir Documento'}</span>
          <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
        </label>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-900 border border-slate-700 rounded-2xl mb-8 shadow-sm">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'tickets' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Plane className="w-4 h-4" /> Billetes y Reservas
        </button>
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'personal' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <UserSquare2 className="w-4 h-4" /> Personales
        </button>
      </div>

      {isLoading && documents.length === 0 ? (
        <div className="text-slate-400 text-center py-10 animate-pulse">Cargando documentos...</div>
      ) : filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
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
                  {doc.aiAnalyzed && (
                    <span className="inline-block mt-2 text-[10px] font-bold bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30">
                      ✓ Procesado por IA
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800/50">
                {activeTab === 'tickets' ? (
                  <button
                    onClick={(e) => handleAnalyze(doc.id, doc.url, e)}
                    disabled={isAnalyzing === doc.id || doc.aiAnalyzed}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      doc.aiAnalyzed 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : isAnalyzing === doc.id
                          ? 'bg-indigo-500/20 text-indigo-400 animate-pulse'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/20'
                    }`}
                    title="Extraer fechas y crear evento en el itinerario automáticamente"
                  >
                    {isAnalyzing === doc.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {isAnalyzing === doc.id ? 'Analizando...' : doc.aiAnalyzed ? 'Analizado' : 'Analizar con IA'}
                  </button>
                ) : (
                  <div></div> /* Spacer para mantener el basurero a la derecha */
                )}

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
          <p className="text-slate-400 mb-4">No hay documentos en esta categoría.</p>
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
