import { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../../../store/documentStore';
import { useItineraryStore } from '../../../store/itineraryStore';
import { FileText, Plus, Trash2, UploadCloud, Sparkles, Loader2, Plane, UserSquare2, Lock } from 'lucide-react';
import DocumentViewer from '../../../components/ui/DocumentViewer';
import { useAuthStore } from '../../../store/authStore';
import { usePremiumCheckout } from '../../../hooks/usePremiumCheckout';
import { format } from 'date-fns';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '../../../config/firebase';
import { Timestamp } from 'firebase/firestore';

export default function DocumentsPage() {
  const { trip } = useOutletContext();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { startCheckout, isCheckoutLoading } = usePremiumCheckout();
  const { documents, subscribeToDocuments, addDocument, deleteDocument, updateDocument, isLoading } = useDocumentStore();
  const { addNode, updateNode } = useItineraryStore();
  
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'personal'
  const [isUploading, setIsUploading] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false); 
  
  const [viewerUrl, setViewerUrl] = useState(null);
  const [viewerName, setViewerName] = useState('');

  useEffect(() => {
    if (trip?.id) {
      const unsubscribe = subscribeToDocuments(trip.id);
      return () => unsubscribe && unsubscribe();
    }
  }, [trip?.id, subscribeToDocuments]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    const userTier = profile?.tier || 'free';
    const currentDocCount = documents.length;
    const requestedUploadCount = files.length;
    
    if (userTier === 'free' && (currentDocCount + requestedUploadCount > 10)) {
      alert(`Prueba gratuita: solo puedes subir hasta 10 documentos por viaje (tienes ${currentDocCount}). Actualiza a Standard o Premium para subir más.`);
      e.target.value = '';
      return;
    }
    
    if (userTier === 'standard' && (currentDocCount + requestedUploadCount > 50)) {
      alert(`Límite Standard alcanzado: máximo 50 documentos por viaje (tienes ${currentDocCount}). Actualiza a Premium para subidas ilimitadas.`);
      e.target.value = '';
      return;
    }

    setIsUploading(true);

    for (const file of files) {
      const isFakeDriveFile = 
        file.name.endsWith('.gdoc') || file.name.endsWith('.desktop') || 
        file.name.endsWith('.url') || file.name.endsWith('.gsheet') ||
        file.size === 0 || (!file.name.includes('.') && file.type === '');

      if (isFakeDriveFile) {
        alert(`Error con "${file.name}": El sistema nos indica que este archivo está vacío o es un enlace. Sube el documento real.`);
        continue;
      }

      try {
        let fileToUpload = file;
        let title = file.name;

        if (file.name.toLowerCase().endsWith('.eml')) {
          try {
            const PostalMime = (await import('postal-mime')).default;
            const parser = new PostalMime();
            const email = await parser.parse(file);
            
            let content = email.html || email.text || 'Sin contenido';
            
            if (email.html && email.attachments && email.attachments.length > 0) {
              for (const att of email.attachments) {
                if (att.contentId && att.content) {
                  const cid = att.contentId.replace(/^</, '').replace(/>$/, '');
                  const dataUrl = await new Promise((resolve, reject) => {
                    const blob = new Blob([att.content], { type: att.mimeType });
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                  });
                  const cidRegex = new RegExp(`cid:${cid}`, 'gi');
                  content = content.replace(cidRegex, dataUrl);
                }
              }
            }

            title = email.subject || file.name.replace('.eml', '.html');
            const newFileName = title.replace(/[^a-zA-Z0-9_.-]/g, '_') + '.html';
            
            fileToUpload = new File([content], newFileName, { type: 'text/html' });
          } catch (parseErr) {
            console.error("Error parseando .eml en frontend:", parseErr);
          }
        }

        await addDocument(trip.id, title, fileToUpload, activeTab);
      } catch (err) {
        alert(`Error subiendo "${file.name}": ` + err.message);
      }
    }
    
    setIsUploading(false);
    e.target.value = ''; 
  };

  const handleBatchAnalyze = async () => {
    const docsToProcess = documents.filter(d => (d.type === 'tickets' || !d.type) && !d.aiAnalyzed);
    if (docsToProcess.length === 0) {
      alert("No hay billetes nuevos por analizar.");
      return;
    }
    
    setIsBatchAnalyzing(true);
    let eventsCreated = 0;
    let eventsMerged = 0;
    let mergedNames = [];
    
    try {
      const functions = getFunctions(app, 'europe-west1');
      const analyzeDocument = httpsCallable(functions, 'analyzeDocument');
      
      const { getDocs, query, collection, orderBy } = await import('firebase/firestore');
      const q = query(collection(db, `trips/${trip.id}/itineraryNodes`), orderBy('startTime', 'asc'));
      const snap = await getDocs(q);
      const currentNodes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      for (const doc of docsToProcess) {
        try {
          if (doc.type === 'tickets' && !doc.aiAnalyzed) {
            let mimeType = 'application/pdf';
            const nameToCheck = (doc.fileName || doc.title || doc.url || '').toLowerCase();
            if (nameToCheck.includes('.png')) mimeType = 'image/png';
            else if (nameToCheck.includes('.jpg') || nameToCheck.includes('.jpeg')) mimeType = 'image/jpeg';
            else if (nameToCheck.includes('.webp')) mimeType = 'image/webp';
            else if (nameToCheck.includes('.eml') || nameToCheck.includes('.txt')) mimeType = 'text/plain';

            const result = await analyzeDocument({ fileUrl: doc.url, mimeType: mimeType });
            
            if (result.data && result.data.success && result.data.data) {
              let events = Array.isArray(result.data.data) ? result.data.data : [result.data.data];
              
              for (const ev of events) {
                const typeMap = { flight: 'flight', accommodation: 'accommodation', activity: 'activity', drive: 'drive', car_rental: 'car_rental' };
                const newType = typeMap[ev.type] || 'activity';
                
                let isDuplicate = false;
                if (ev.startTime) {
                  const duplicateNode = currentNodes.find(en => {
                    if (en.type !== newType) return false;
                    const existingTime = en.startTime?.toMillis ? en.startTime.toMillis() : new Date(en.startTime).getTime();
                    const newStartTime = new Date(ev.startTime).getTime();
                    const diffHours = Math.abs(existingTime - newStartTime) / (1000 * 60 * 60);
                    
                    const getWords = (str) => (str || '').toLowerCase().split(/[^a-z0-9áéíóúñ]+/).filter(w => w.length >= 4);
                    const existingWords = getWords(en.title);
                    const newWords = getWords(ev.title);
                    const sharesWords = existingWords.some(w => newWords.includes(w));

                    if (!sharesWords) return false; // Nunca fusionar si los nombres no tienen nada que ver

                    if (newType === 'accommodation' || newType === 'car_rental') {
                      return diffHours < 24; // Mismo día y mismo nombre
                    } else if (newType === 'flight' || newType === 'drive') {
                      return diffHours < 6; // Menos de 6h y mismo nombre
                    } else {
                      return diffHours < 4; // Menos de 4h y mismo nombre
                    }
                  });

                  if (duplicateNode) {
                    isDuplicate = true;
                    let finalCost = ev.cost ? parseFloat(ev.cost) : 0;
                    const extractedCurrency = (ev.currency || 'EUR').toUpperCase();
                    if (extractedCurrency !== 'EUR' && trip.exchangeRate && trip.exchangeRate > 0) {
                      finalCost = parseFloat((finalCost / trip.exchangeRate).toFixed(2));
                    }

                    const newNotes = `${duplicateNode.notes || ''}\n\n[Fusionado - Doc: ${doc.title}]\nMoneda Original: ${ev.cost} ${extractedCurrency}\n\n${ev.details || ''}`.trim();
                    
                    const existingAttachments = duplicateNode.attachments || [];
                    const isNewDocument = !existingAttachments.some(att => att.url === doc.url);
                    
                    let newCost = duplicateNode.cost || 0;
                    if (finalCost > 0 && isNewDocument) {
                      newCost += finalCost;
                    }
                    
                    const newAttachments = [...existingAttachments];
                    if (isNewDocument) {
                      newAttachments.push({ name: doc.title, url: doc.url });
                    }
                    const newTags = [...(duplicateNode.tags || []), 'REVISAR PRECIO'];
                    
                    const updateData = { notes: newNotes, cost: newCost, attachments: newAttachments, tags: newTags };
                    
                    // Si el nuevo evento tiene datos extra y el original no, los fusionamos
                    if (ev.endTime && !duplicateNode.endTime) {
                      updateData.endTime = Timestamp.fromDate(new Date(ev.endTime));
                    }
                    if (ev.dropoffLocation && !duplicateNode.dropoffLocation) {
                      const dropName = ev.dropoffLocation.name || 'Lugar de devolución';
                      updateData.dropoffLocation = { name: dropName, address: dropName };
                      if (ev.dropoffLocation.lat && ev.dropoffLocation.lng) {
                        updateData.dropoffLocation.lat = parseFloat(ev.dropoffLocation.lat);
                        updateData.dropoffLocation.lng = parseFloat(ev.dropoffLocation.lng);
                      }
                    }
                    
                    // Fusionar datos de contacto si faltan en el original
                    if (ev.contactPhone && !duplicateNode.contactPhone) updateData.contactPhone = ev.contactPhone;
                    if (ev.contactWhatsapp && !duplicateNode.contactWhatsapp) updateData.contactWhatsapp = ev.contactWhatsapp;
                    if (ev.contactEmail && !duplicateNode.contactEmail) updateData.contactEmail = ev.contactEmail;
                    if (ev.contactName && !duplicateNode.contactName) updateData.contactName = ev.contactName;
                    if (ev.externalUrl && !duplicateNode.externalUrl) updateData.externalUrl = ev.externalUrl;
                    if (ev.isPaid !== undefined && duplicateNode.isPaid === undefined) updateData.isPaid = ev.isPaid;
                    
                    await updateNode(trip.id, duplicateNode.id, updateData);
                    
                    // Actualizar en la caché para las siguientes pasadas
                    Object.assign(duplicateNode, updateData);
                    eventsMerged++;
                    mergedNames.push(`"${ev.title}" se unió a "${duplicateNode.title}"`);
                  }
                }
                
                if (!isDuplicate) {
                  let finalCost = ev.cost ? parseFloat(ev.cost) : 0;
                  const extractedCurrency = (ev.currency || 'EUR').toUpperCase();
                  
                  if (extractedCurrency !== 'EUR' && trip.exchangeRate && trip.exchangeRate > 0) {
                    finalCost = parseFloat((finalCost / trip.exchangeRate).toFixed(2));
                  }

                  const nodeData = {
                    type: newType,
                    title: ev.title || 'Evento Importado',
                    startTime: ev.startTime ? Timestamp.fromDate(new Date(ev.startTime)) : Timestamp.now(),
                    endTime: ev.endTime ? Timestamp.fromDate(new Date(ev.endTime)) : null,
                    cost: finalCost,
                    currency: extractedCurrency !== 'EUR' && trip.exchangeRate ? 'EUR' : extractedCurrency,
                    notes: `[Doc: ${doc.title}]\nMoneda Original: ${ev.cost} ${extractedCurrency}\n\n${ev.details || ''}`,
                    contactPhone: ev.contactPhone || null,
                    contactWhatsapp: ev.contactWhatsapp || null,
                    contactEmail: ev.contactEmail || null,
                    contactName: ev.contactName || null,
                    externalUrl: ev.externalUrl || null,
                    isPaid: ev.isPaid !== false,
                    isAIImported: true,
                    attachments: [{ name: doc.title, url: doc.url }]
                  };
                  
                  if (ev.location) {
                    const locName = ev.location.name || 'Lugar desconocido';
                    nodeData.location = { name: locName, address: locName };
                    
                    if (ev.location.lat && ev.location.lng) {
                      nodeData.location.lat = parseFloat(ev.location.lat);
                      nodeData.location.lng = parseFloat(ev.location.lng);
                    } else {
                      // Geocodificación automática de respaldo
                      try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locName)}`);
                        const data = await res.json();
                        if (data && data.length > 0) {
                          nodeData.location.lat = parseFloat(data[0].lat);
                          nodeData.location.lng = parseFloat(data[0].lon);
                        }
                      } catch (geoErr) {
                        console.error('Error buscando coordenadas para el mapa:', geoErr);
                      }
                    }
                  }

                  if (ev.dropoffLocation) {
                    const dropName = ev.dropoffLocation.name || 'Lugar de devolución desconocido';
                    nodeData.dropoffLocation = { name: dropName, address: dropName };
                    
                    if (ev.dropoffLocation.lat && ev.dropoffLocation.lng) {
                      nodeData.dropoffLocation.lat = parseFloat(ev.dropoffLocation.lat);
                      nodeData.dropoffLocation.lng = parseFloat(ev.dropoffLocation.lng);
                    } else {
                      try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dropName)}`);
                        const data = await res.json();
                        if (data && data.length > 0) {
                          nodeData.dropoffLocation.lat = parseFloat(data[0].lat);
                          nodeData.dropoffLocation.lng = parseFloat(data[0].lon);
                        }
                      } catch (geoErr) {
                        console.error('Error buscando coordenadas dropoff:', geoErr);
                      }
                    }
                  }
                  
                  const createdNodeId = await addNode(trip.id, nodeData, []);
                  currentNodes.push({ id: createdNodeId, ...nodeData }); // Añadir a cache para siguiente documento
                  eventsCreated++;
                }
              }
              await updateDocument(trip.id, doc.id, { aiAnalyzed: true });
            }
            
            // Pausa de 5 segundos para no saturar la capa gratuita de Google (evita error 503/429)
            if (docsToProcess.length > 1) {
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }
        } catch (docErr) {
          console.error(`Error analizando doc ${doc.title}:`, docErr);
          alert(`Fallo al analizar "${doc.title}": ${docErr.message}`);
        }
      }
      
      if (eventsCreated > 0 || eventsMerged > 0) {
        let msg = `Análisis completado.\nSe crearon ${eventsCreated} eventos nuevos y se fusionaron ${eventsMerged} con eventos existentes.`;
        if (eventsMerged > 0) {
          msg += `\n\nDetalles de fusión:\n` + mergedNames.map(m => `- ${m}`).join('\n');
          msg += `\n\n⚠️ IMPORTANTE: Al fusionar eventos, se han sumado los precios automáticamente. Revisa los eventos con la etiqueta 'REVISAR PRECIO' para asegurarte de que el importe total es correcto y no está duplicado.`;
        }
        alert(msg);
      } else {
        alert("Análisis completado. No se encontraron datos válidos o los documentos ya estaban procesados.");
      }
      
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error general procesando los documentos.');
    } finally {
      setIsBatchAnalyzing(false);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Documentos</h2>
          <p className="text-slate-400 text-sm">Gestiona tus reservas y documentos personales.</p>
        </div>
        <label className="bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 border border-teal-500/30 font-bold py-2 px-4 rounded-xl transition-all flex items-center gap-2 shadow-lg cursor-pointer shrink-0">
          <UploadCloud className="w-4 h-4" />
          <span>{isUploading ? 'Subiendo...' : 'Subir Documento'}</span>
          <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={isUploading} />
        </label>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-900 border border-slate-700 rounded-2xl mb-6 shadow-sm">
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

      {activeTab === 'tickets' && (
        <div className="mb-6 bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Buzón Inteligente</h3>
              {trip.emailAlias ? (
                <p className="text-slate-400 text-xs mt-0.5">
                  Reenvía tus reservas a <span className="text-indigo-300 font-mono font-bold bg-indigo-500/10 px-1 rounded">{trip.emailAlias}@roadmapp.axonailabs.es</span>
                </p>
              ) : (
                <p className="text-slate-400 text-xs mt-0.5">
                  Configura un alias en los ajustes del viaje para reenviar reservas por email.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tickets' && documents.some(d => (d.type === 'tickets' || !d.type) && !d.aiAnalyzed) && (
        <div className="mb-8 flex justify-center">
          {profile?.tier === 'premium' ? (
            <button
              onClick={handleBatchAnalyze}
              disabled={isBatchAnalyzing}
              className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isBatchAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analizando documentos...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                  <span>Analizar Nuevos Documentos con IA</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={startCheckout}
              disabled={isCheckoutLoading}
              className="w-full md:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isCheckoutLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
              <span>Actualizar a Premium para extraer datos con IA</span>
            </button>
          )}
        </div>
      )}

      {isLoading && documents.length === 0 ? (
        <div className="text-slate-400 text-center py-10 animate-pulse">Cargando documentos...</div>
      ) : filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredDocs.map((doc) => (
            <div 
              key={doc.id}
              onClick={() => { setViewerUrl(doc.url); setViewerName(doc.title); }}
              className="bg-slate-900 border border-slate-700 hover:border-teal-500/50 rounded-2xl p-3 flex items-center gap-3 cursor-pointer transition-colors group shadow-lg"
            >
              <div className="p-2.5 bg-slate-800 rounded-xl text-teal-400 group-hover:bg-teal-500/20 transition-colors shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="font-semibold text-sm text-white truncate w-full" title={doc.title}>{doc.title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-slate-500">
                    {doc.createdAt?.toDate ? format(doc.createdAt.toDate(), 'dd MMM yyyy') : 'Reciente'}
                  </p>
                  {doc.aiAnalyzed && (
                    <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">
                      ✓ IA
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={(e) => handleDelete(doc.id, e)}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
                title="Eliminar documento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-700">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Ningún documento</h3>
          <p className="text-slate-400 max-w-sm mx-auto">
            Sube billetes de avión, reservas de hotel o documentos personales para tenerlos siempre a mano.
          </p>
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
