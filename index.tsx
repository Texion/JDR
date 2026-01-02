
<!DOCTYPE html>
<html lang="fr" class="bg-[#020617]">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forge de Héros - JDR</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=MedievalSharp&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --amber-glow: 0 0 15px rgba(245, 158, 11, 0.3);
        }
        body {
            font-family: 'Inter', sans-serif;
            background-color: #020617;
            color: #f1f5f9;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        #root {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .medieval-font {
            font-family: 'MedievalSharp', cursive;
        }
        .stat-card {
            background: rgba(30, 41, 59, 0.4);
            backdrop-filter: blur(8px);
            transition: all 0.2s ease-out;
            position: relative;
        }
        .stat-card.recommended {
            border-color: rgba(245, 158, 11, 0.3);
            background: rgba(245, 158, 11, 0.05);
        }
        .stat-card:hover {
            border-color: rgba(245, 158, 11, 0.5);
            background: rgba(30, 41, 59, 0.6);
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in {
            animation: slideIn 0.5s ease-out forwards;
        }
        .custom-select {
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f59e0b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 1rem center;
            background-size: 1.5em;
        }
        input, select, textarea {
            background-color: #0a0f1e !important;
            border: 1px solid #1e293b !important;
            color: white !important;
        }
        input:focus, select:focus, textarea:focus {
            border-color: #f59e0b !important;
            box-shadow: 0 0 0 1px #f59e0b !important;
        }
        .recommended-badge {
            position: absolute;
            top: -8px;
            right: 8px;
            background: #f59e0b;
            color: #020617;
            font-size: 8px;
            font-weight: 900;
            padding: 1px 6px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #1e293b;
            border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #f59e0b;
        }
    </style>
    <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@18.2.0",
        "react-dom": "https://esm.sh/react-dom@18.2.0",
        "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
        "htm": "https://esm.sh/htm@3.1.1",
        "@google/genai": "https://esm.sh/@google/genai@1.34.0",
        "recharts": "https://esm.sh/recharts@2.12.7?external=react,react-dom",
        "jspdf": "https://esm.sh/jspdf@2.5.1"
      }
    }
    </script>
<link rel="stylesheet" href="/index.css">
</head>
<body>
    <div id="root"></div>

    <script type="module">
    import React, { useState, useMemo, useEffect } from 'react';
    import { createRoot } from 'react-dom/client';
    import htm from 'htm';
    import { GoogleGenAI } from '@google/genai';
    import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
    import { jsPDF } from 'jspdf';

    const html = htm.bind(React.createElement);

    const MAX_POINTS = 20;
    const STAT_LIMIT = 10;
    const MAX_SELECTED_ABILITIES = 4;
    const MAX_TALENT_PAIRS = 3;

    const RACES = ["Humain", "Elfe", "Nain", "Halfelin", "Orc", "Tieffelin", "Drakéide", "Gnome", "Tabaxi", "Firbolg", "Goliath", "Aasimar", "Kenku", "Lézardoïde"];

    const TALENTS_POSITIVE = [
        { id: 'vision', label: 'Vision Nocturne', desc: 'Voit parfaitement dans le noir total.' },
        { id: 'chance', label: 'Chance Insolente', desc: 'Peut relancer un dé une fois par jour.' },
        { id: 'volonte', label: 'Volonté de Fer', desc: 'Immunisé à la peur mineure.' },
        { id: 'reflexes', label: 'Réflexes Éclairs', desc: '+2 aux tests d\'initiative.' },
        { id: 'charisme', label: 'Charisme Naturel', desc: 'Avantage sur la persuasion.' },
        { id: 'endurance', label: 'Endurance de Nain', desc: 'Peut marcher deux fois plus longtemps.' },
        { id: 'esprit', label: 'Esprit Analytique', desc: 'Détecte les pièges plus facilement.' },
        { id: 'affinite', label: 'Affinité Animale', desc: 'Les bêtes sauvages sont moins agressives.' },
        { id: 'orientation', label: 'Boussole Interne', desc: 'Ne se perd jamais dans les labyrinthes.' },
        { id: 'sommeil_leger', label: 'Sommeil Léger', desc: 'Impossible à surprendre durant le repos.' },
        { id: 'resist_poison', label: 'Métabolisme Robuste', desc: 'Avantage contre les poisons.' },
        { id: 'sang_froid', label: 'Sang-Froid', desc: 'Garde son calme sous pression extrême.' },
        { id: 'polyglotte', label: 'Polyglotte', desc: 'Comprend 3 langues additionnelles.' },
        { id: 'memoire', label: 'Mémoire de Scoliaste', desc: 'Se souvient de chaque visage croisé.' },
        { id: 'pas_loup', label: 'Pas de Loup', desc: 'Ne fait aucun bruit sur le plancher.' },
        { id: 'acier', label: 'Peau d\'Acier', desc: 'Réduit les dégâts de chute de moitié.' },
        { id: 'main_geant', label: 'Poigne de Fer', desc: 'Impossible à désarmer en combat.' },
        { id: 'vue_percante', label: 'Oeil de Faucon', desc: 'Voit des détails à 1 kilomètre.' },
        { id: 'erudition', label: 'Savoir Local', desc: 'Connaît l\'histoire de chaque ruine.' },
        { id: 'reputation', label: 'Aura Héroïque', desc: 'Les marchands offrent 10% de remise.' },
        { id: 'instinct', label: 'Instinct de Survie', desc: 'Sent le danger 1 tour avant qu\'il arrive.' },
        { id: 'voix', label: 'Voix de Sirène', desc: 'Peut charmer par le simple chant.' },
        { id: 'doigts', label: 'Doigts de Fée', desc: 'Pickpocket sans jamais être senti.' },
        { id: 'meditation', label: 'Transe Méditative', desc: 'Récupère ses sorts en 2h de repos.' },
        { id: 'resist_froid', label: 'Enfant de l\'Hiver', desc: 'Immunisé aux effets du froid intense.' },
        { id: 'resist_feu', label: 'Sang de Dragon', desc: 'Résiste naturellement aux brûlures.' },
        { id: 'nageur', label: 'Silhouette de Squale', desc: 'Nage aussi vite qu\'il court.' },
        { id: 'grimpeur', label: 'Lézard des Cimes', desc: 'Grimpe les parois lisses sans corde.' },
        { id: 'cavalier', label: 'Murmure Équin', desc: 'Contrôle n\'importe quelle monture.' },
        { id: 'alchimiste', label: 'Nez d\'Herboriste', desc: 'Identifie les plantes d\'un simple flair.' }
    ];

    const TALENTS_NEGATIVE = [
        { id: 'phobie', label: 'Phobie du Sang', desc: 'Étourdi à la vue d\'une blessure grave.' },
        { id: 'myope', label: 'Myope', desc: 'Malus aux attaques à distance lointaines.' },
        { id: 'boiteux', label: 'Boiteux', desc: 'Vitesse de déplacement réduite de 25%.' },
        { id: 'arrogant', label: 'Arrogant', desc: 'Malus aux tests de diplomatie.' },
        { id: 'fragile', label: 'Constitution Fragile', desc: '-1 PV par niveau.' },
        { id: 'peur_noir', label: 'Peur du Noir', desc: 'Malus de stress dans l\'obscurité.' },
        { id: 'gourmand', label: 'Gourmandise', desc: 'Consomme deux fois plus de rations.' },
        { id: 'amnesie', label: 'Amnésie Partielle', desc: 'Oublie parfois des détails importants.' },
        { id: 'malchance', label: 'Chat Noir', desc: 'Les échecs critiques sont plus fréquents.' },
        { id: 'allergie', label: 'Allergie au Métal', desc: 'Porter une armure cause des plaques.' },
        { id: 'plomb', label: 'Sommeil de Plomb', desc: 'Impossible à réveiller en pleine nuit.' },
        { id: 'oreille', label: 'Sens de l\'Équilibre Faible', desc: 'Tombe facilement si bousculé.' },
        { id: 'foules', label: 'Agoraphobe', desc: 'Stress intense dans les villes peuplées.' },
        { id: 'bavard', label: 'Bavardage Incessant', desc: 'Malus en discrétion à cause du bruit.' },
        { id: 'mer', label: 'Mal de Mer', desc: 'Incapable de combattre sur un bateau.' },
        { id: 'moites', label: 'Mains Moites', desc: 'Lâche parfois son arme par accident.' },
        { id: 'sensible', label: 'Douillet', desc: 'La douleur dure deux fois plus longtemps.' },
        { id: 'distrait', label: 'Tête en l\'Air', desc: 'Malus de perception quand il réfléchit.' },
        { id: 'odorat', label: 'Odorat Atrophié', desc: 'Ne sent pas les poisons ou le gaz.' },
        { id: 'douteuse', label: 'Réputation de Vaurien', desc: 'Les gardes le surveillent de près.' },
        { id: 'obsession', label: 'Maniaque du Détail', desc: 'Perd du temps à tout ranger.' },
        { id: 'claus', label: 'Claustrophobe', desc: 'Panique dans les couloirs étroits.' },
        { id: 'lent', label: 'Esprit Brumeux', desc: 'Réagit toujours en dernier au combat.' },
        { id: 'maladroit', label: 'Deux Mains Gauches', desc: 'Casse souvent les objets fragiles.' },
        { id: 'vertige', label: 'Vertige Chronique', desc: 'Paralysé au-dessus de 2 mètres.' },
        { id: 'insomnie', label: 'Insomniaque', desc: 'Met des heures à s\'endormir le soir.' },
        { id: 'para', label: 'Paranoïaque', desc: 'Ne fait jamais confiance aux inconnus.' },
        { id: 'jeu', label: 'Addict au Jeu', desc: 'Parie tout son or à chaque taverne.' },
        { id: 'discorde', label: 'Voix de Corbeau', desc: 'Incapable de chanter ou de convaincre.' },
        { id: 'froid', label: 'Frileux', desc: 'Besoin constant de feu ou de laine.' }
    ];

    const CLASS_DATA = {
        "Guerrier": {
            desc: "Maître incontesté des armes et du combat tactique, pilier de toute ligne de front.",
            reco: ["Force", "Vitalité"],
            abilities: [
                { name: "Second Souffle", description: "Le guerrier puise dans ses réserves d'adrénaline pour stabiliser ses blessures.", damage: "1d10 + niv PV" },
                { name: "Enchaînement", description: "Une rotation fluide de l'arme en zone.", damage: "1d8 + For PHYSIQUE" },
                { name: "Cri de Guerre", description: "Réduit l'attaque ennemie.", damage: "1d4 PSYCHIQUE" },
                { name: "Posture Défensive", description: "Réduit les dégâts PHYSIQUES reçus.", damage: "-1d6 Dégâts" }
            ]
        },
        "Mage": {
            desc: "Érudit des forces arcaniques, capable de tordre la réalité.",
            reco: ["Intelligence", "Sagesse"],
            abilities: [
                { name: "Projectile Magique", description: "Trois dards d'énergie pure inévitables.", damage: "3x(1d4+1) FORCE" },
                { name: "Bouclier de Mana", description: "Champ de force absorbant les dégâts.", damage: "2d6 Prot" },
                { name: "Nova de Givre", description: "Explosion de froid immobilisante.", damage: "1d8 FROID" },
                { name: "Éclair", description: "Décharge électrique rectiligne.", damage: "3d6 FOUDRE" }
            ]
        },
        "Voleur": {
            desc: "Maître de l'ombre et de l'opportunisme.",
            reco: ["Dextérité", "Charisme"],
            abilities: [
                { name: "Sournoise", description: "Dégâts massifs sur cible distraite.", damage: "+2d6 PERFORANT" },
                { name: "Disparition", description: "Bombe fumigène tactique.", damage: "N/A" },
                { name: "Coup Bas", description: "Réduit la vitesse de 50%.", damage: "1d4 + Infirmité" },
                { name: "Esquive Rapide", description: "Évite totalement une attaque.", damage: "N/A" }
            ]
        },
        "Clerc": {
            desc: "Canal divin capable de miracles ou de châtiments.",
            reco: ["Sagesse", "Vitalité"],
            abilities: [
                { name: "Soin Lumineux", description: "Restaure les PV d'un allié.", damage: "1d8 + Sag SOIN" },
                { name: "Marteau Sacré", description: "Arme de lumière céleste.", damage: "1d10 RADIANT" },
                { name: "Bénédiction", description: "Bonus de +1d4 aux tests.", damage: "Support" },
                { name: "Purification", description: "Retire les poisons et malédictions.", damage: "N/A" }
            ]
        }
    };

    const CLASSES = Object.keys(CLASS_DATA);

    const STATS_CONFIG = [
        { id: 'Force', desc: "Puissance." },
        { id: 'Dextérité', desc: "Agilité." },
        { id: 'Vitalité', desc: "Endurance." },
        { id: 'Intelligence', desc: "Savoir." },
        { id: 'Sagesse', desc: "Intuition." },
        { id: 'Charisme', desc: "Aura." }
    ];

    const StatControl = ({ name, value, desc, onUpdate, canAdd, canSub, isRecommended }) => html`
        <div className=${`stat-card border border-slate-700 rounded-xl p-3 flex flex-col justify-between gap-2 ${isRecommended ? 'recommended' : ''}`}>
            ${isRecommended && html`<div className="recommended-badge">Conseillé</div>`}
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <span className="text-amber-500 font-bold text-sm">${name}</span>
                    <span className="text-[9px] text-slate-500 uppercase">${desc}</span>
                </div>
                <span className="text-xl font-mono font-black text-white">${value}</span>
            </div>
            <div className="flex gap-1.5 mt-1">
                <button onClick=${() => onUpdate(-1)} disabled=${!canSub} className="flex-1 bg-slate-900 border border-slate-700 py-1 rounded-lg text-amber-500 hover:bg-slate-800 disabled:opacity-10">-</button>
                <button onClick=${() => onUpdate(1)} disabled=${!canAdd} className="flex-1 bg-slate-900 border border-slate-700 py-1 rounded-lg text-amber-500 hover:bg-slate-800 disabled:opacity-10">+</button>
            </div>
        </div>
    `;

    const App = () => {
        const [firstName, setFirstName] = useState('');
        const [lastName, setLastName] = useState('');
        const [race, setRace] = useState(RACES[0]);
        const [charClass, setCharClass] = useState(CLASSES[0]);
        const [stats, setStats] = useState(() => STATS_CONFIG.reduce((acc, s) => ({ ...acc, [s.id]: 0 }), {}));
        const [allClassAbilities, setAllClassAbilities] = useState([]);
        const [selectedAbilitiesIndices, setSelectedAbilitiesIndices] = useState([]);
        const [selectedPositiveTalents, setSelectedPositiveTalents] = useState([]);
        const [selectedNegativeTalents, setSelectedNegativeTalents] = useState([]);
        const [loading, setLoading] = useState(false);

        useEffect(() => {
            const defaultAbilities = (CLASS_DATA[charClass] || CLASS_DATA["Guerrier"]).abilities;
            setAllClassAbilities(defaultAbilities.map(a => ({ ...a })));
            setSelectedAbilitiesIndices([]); 
        }, [charClass]);

        const toggleAbilitySelection = (index) => {
            if (selectedAbilitiesIndices.includes(index)) {
                setSelectedAbilitiesIndices(selectedAbilitiesIndices.filter(i => i !== index));
            } else if (selectedAbilitiesIndices.length < MAX_SELECTED_ABILITIES) {
                setSelectedAbilitiesIndices([...selectedAbilitiesIndices, index]);
            }
        };

        const togglePositiveTalent = (id) => {
            if (selectedPositiveTalents.includes(id)) {
                setSelectedPositiveTalents(selectedPositiveTalents.filter(t => t !== id));
            } else if (selectedPositiveTalents.length < MAX_TALENT_PAIRS) {
                setSelectedPositiveTalents([...selectedPositiveTalents, id]);
            }
        };

        const toggleNegativeTalent = (id) => {
            if (selectedNegativeTalents.includes(id)) {
                setSelectedNegativeTalents(selectedNegativeTalents.filter(t => t !== id));
            } else if (selectedNegativeTalents.length < MAX_TALENT_PAIRS) {
                setSelectedNegativeTalents([...selectedNegativeTalents, id]);
            }
        };

        const selectedAbilities = useMemo(() => selectedAbilitiesIndices.map(index => allClassAbilities[index]), [selectedAbilitiesIndices, allClassAbilities]);
        const talentsBalanced = selectedPositiveTalents.length === selectedNegativeTalents.length;
        const spentPoints = useMemo(() => Object.values(stats).reduce((a, b) => a + b, 0), [stats]);
        const remaining = MAX_POINTS - spentPoints;
        const canGenerate = firstName.trim() && selectedAbilitiesIndices.length > 0 && talentsBalanced;

        const chartData = useMemo(() => STATS_CONFIG.map(s => ({
            subject: s.id.substring(0, 3).toUpperCase(),
            A: stats[s.id] || 0,
            fullMark: STAT_LIMIT
        })), [stats]);

        const downloadPdf = (lore) => {
            const doc = new jsPDF();
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(245, 158, 11);
            doc.text("FORGE DE HÉROS", 105, 20, { align: "center" });
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text("FICHE DE PERSONNAGE JDR", 105, 26, { align: "center" });
            doc.setDrawColor(245, 158, 11);
            doc.line(20, 30, 190, 30);
            doc.setFontSize(26);
            doc.setTextColor(0, 0, 0);
            doc.text(`${firstName} ${lastName}`.trim(), 20, 45);
            doc.setFontSize(12);
            doc.setTextColor(80, 80, 80);
            doc.text(`Race: ${race} | Classe: ${charClass}`, 20, 52);
            
            doc.setFontSize(14);
            doc.setTextColor(245, 158, 11);
            doc.text("ATTRIBUTS", 20, 65);
            let y = 73;
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            Object.entries(stats).forEach(([k, v]) => {
                doc.text(`${k}: ${v}`, 20, y);
                y += 6;
            });

            doc.setFontSize(14);
            doc.setTextColor(245, 158, 11);
            doc.text("HISTOIRE", 20, 120);
            doc.setFontSize(9);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(50, 50, 50);
            const splitLore = doc.splitTextToSize(lore || "Destinée inconnue...", 170);
            doc.text(splitLore, 20, 128);
            
            doc.save(`${firstName || 'Heros'}_Fiche.pdf`);
        };

        const downloadJson = () => {
            const data = { firstName, lastName, race, charClass, stats, talents: { positive: selectedPositiveTalents, negative: selectedNegativeTalents }, abilities: selectedAbilities };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `${firstName}_Fiche.json`; a.click();
        };

        const generateCharacter = async () => {
            if (!canGenerate) return;
            setLoading(true);
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const prompt = `Génère une bio JDR courte (150 mots) pour ${firstName} ${lastName}, ${race} ${charClass}. 
                    Talents: ${selectedPositiveTalents.join(', ')}. Faiblesses: ${selectedNegativeTalents.join(', ')}.
                    Stats: ${JSON.stringify(stats)}. Concentre toi sur le contraste entre ses talents et ses fardeaux.`;
                const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
                downloadPdf(response.text);
            } catch (e) {
                console.error(e);
                downloadPdf("Le destin est incertain, mais le héros est prêt.");
            } finally {
                setLoading(false);
            }
        };

        const updateStat = (id, delta) => {
            setStats(p => {
                const newVal = (p[id] || 0) + delta;
                if (newVal < 0 || newVal > STAT_LIMIT || (delta > 0 && remaining <= 0)) return p;
                return { ...p, [id]: newVal };
            });
        };

        return html`
            <div className="flex-1 w-full bg-[#020617] p-4 md:p-8 lg:p-12">
                <header className="text-center mb-12">
                    <h1 className="medieval-font text-6xl md:text-8xl text-amber-500 mb-3">Forge de Héros</h1>
                    <p className="text-slate-400 font-medium italic text-lg">Créez votre destinée.</p>
                </header>

                <main className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                    <div className="xl:col-span-8 space-y-8">
                        <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl space-y-6 shadow-2xl">
                            <h2 className="medieval-font text-2xl text-amber-500 border-b border-amber-500/20 pb-3">Identité</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <input value=${firstName} onChange=${e => setFirstName(e.target.value)} className="w-full rounded-2xl px-5 py-3 outline-none" placeholder="Prénom"/>
                                <input value=${lastName} onChange=${e => setLastName(e.target.value)} className="w-full rounded-2xl px-5 py-3 outline-none" placeholder="Nom"/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <select value=${race} onChange=${e => setRace(e.target.value)} className="custom-select w-full rounded-2xl px-5 py-3 outline-none">
                                    ${RACES.map(r => html`<option value=${r}>${r}</option>`)}
                                </select>
                                <select value=${charClass} onChange=${e => setCharClass(e.target.value)} className="custom-select w-full rounded-2xl px-5 py-3 outline-none">
                                    ${CLASSES.map(c => html`<option value=${c}>${c}</option>`)}
                                </select>
                            </div>
                            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                                <h3 className="text-xs font-bold text-amber-500 uppercase mb-1">À propos du ${charClass}</h3>
                                <p className="text-sm text-slate-400 italic">${(CLASS_DATA[charClass] || {}).desc}</p>
                            </div>
                        </section>

                        <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl space-y-6 shadow-2xl">
                            <h2 className="medieval-font text-2xl text-amber-500 border-b border-amber-500/20 pb-3">Talents (Équilibrés ${selectedPositiveTalents.length}/${selectedNegativeTalents.length})</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-emerald-500 uppercase">Positifs (Max 3)</h3>
                                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        ${TALENTS_POSITIVE.map(t => html`
                                            <button onClick=${() => togglePositiveTalent(t.id)} className=${`text-left p-3 rounded-xl border text-xs ${selectedPositiveTalents.includes(t.id) ? 'bg-emerald-500/20 border-emerald-500' : 'bg-slate-950/40 border-slate-800'}`}>
                                                <div className="font-bold">${t.label}</div>
                                            </button>
                                        `)}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-rose-500 uppercase">Fardeaux (Max 3)</h3>
                                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        ${TALENTS_NEGATIVE.map(t => html`
                                            <button onClick=${() => toggleNegativeTalent(t.id)} className=${`text-left p-3 rounded-xl border text-xs ${selectedNegativeTalents.includes(t.id) ? 'bg-rose-500/20 border-rose-500' : 'bg-slate-950/40 border-slate-800'}`}>
                                                <div className="font-bold">${t.label}</div>
                                            </button>
                                        `)}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl space-y-6 shadow-2xl">
                             <h2 className="medieval-font text-2xl text-amber-500 border-b border-amber-500/20 pb-3">Capacités (${selectedAbilitiesIndices.length}/4)</h2>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                ${allClassAbilities.map((ab, idx) => html`
                                    <button key=${idx} onClick=${() => toggleAbilitySelection(idx)} className=${`text-left p-4 rounded-2xl border ${selectedAbilitiesIndices.includes(idx) ? 'bg-amber-500/10 border-amber-500' : 'bg-slate-950/40 border-slate-800'}`}>
                                        <div className="font-bold text-xs uppercase">${ab.name}</div>
                                        <div className="text-[10px] text-slate-500 line-clamp-1">${ab.description}</div>
                                    </button>
                                `)}
                             </div>
                        </section>

                        <div className="flex flex-col md:flex-row gap-4">
                            <button onClick=${generateCharacter} disabled=${loading || !canGenerate} className=${`flex-1 py-6 text-slate-950 font-black text-2xl rounded-3xl shadow-2xl transition-all uppercase ${canGenerate ? 'bg-amber-500 hover:bg-amber-400' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
                                ${loading ? 'Destinée en cours...' : !talentsBalanced ? 'Déséquilibre de Talents' : 'Générer la fiche (PDF)'}
                            </button>
                            <button onClick=${downloadJson} disabled=${loading || !canGenerate} className="py-6 px-10 text-amber-500 font-bold border border-amber-500/30 rounded-3xl hover:bg-amber-500/10 transition-all uppercase">JSON</button>
                        </div>
                    </div>

                    <div className="xl:col-span-4 space-y-8">
                        <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl shadow-2xl h-fit sticky top-6">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="medieval-font text-2xl text-amber-500">Attributs</h2>
                                <div className="bg-amber-500/10 px-4 py-2 rounded-2xl text-amber-500 font-mono font-bold text-2xl">${remaining}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                ${STATS_CONFIG.map(s => html`
                                    <${StatControl} key=${s.id} name=${s.id} desc=${s.desc} value=${stats[s.id] || 0} isRecommended=${(CLASS_DATA[charClass]?.reco || []).includes(s.id)} canSub=${stats[s.id] > 0} canAdd=${remaining > 0 && stats[s.id] < STAT_LIMIT} onUpdate=${(d) => updateStat(s.id, d)} />
                                `)}
                            </div>
                            <div className="h-[250px] w-full mt-8 border border-slate-800 rounded-2xl p-2">
                                <${ResponsiveContainer} width="100%" height="100%">
                                    <${RadarChart} data=${chartData}>
                                        <${PolarGrid} stroke="#1e293b" />
                                        <${PolarAngleAxis} dataKey="subject" tick=${{ fill: '#64748b', fontSize: 10 }} />
                                        <${Radar} name="Stats" dataKey="A" stroke="#f59e0b" fill="#f59e0b" fillOpacity=${0.5} />
                                    </${RadarChart}>
                                </${ResponsiveContainer}>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        `;
    };

    const root = createRoot(document.getElementById('root'));
    root.render(html`<${App} />`);
    </script>
<script type="module" src="/index.tsx"></script>
</body>
</html>
