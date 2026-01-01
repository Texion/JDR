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

const COMBAT_STYLES = [
    { id: 'dual', label: '1 arme dans chaque main', icon: '⚔️' },
    { id: 'two-handed', label: '1 arme à deux mains', icon: '🔨' },
    { id: 'none', label: 'Aucune arme', icon: '✨' }
];

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
            { name: "Second Souffle", description: "Le guerrier puise dans ses réserves d'adrénaline pour stabiliser ses blessures. Restaure immédiatement des PV.", damage: "1d10 + niveau PV" },
            { name: "Enchaînement", description: "Une rotation fluide de l'arme. Inflige des dégâts TRANCHANTS à toutes les cibles dans un arc de 180°.", damage: "1d8 + For PHYSIQUE" },
            { name: "Cri de Guerre", description: "Un rugissement viscéral qui glace le sang. Inflige des dégâts PSYCHIQUES et réduit l'attaque ennemie.", damage: "1d4 PSYCHIQUE" },
            { name: "Posture Défensive", description: "Verrouille sa garde pour absorber les chocs. Réduit les dégâts PHYSIQUES reçus par le guerrier.", damage: "-1d6 Dégâts" },
            { name: "Frappe de Pommeau", description: "Coup précis aux tempes. Inflige des dégâts CONTONDANTS légers et ÉTOURDIT la cible pour 1 tour.", damage: "1d4 CONTONDANT" },
            { name: "Brise-Armure", description: "Attaque lourdement les jointures. Inflige des dégâts PERFORANTS et réduit la Classe d'Armure adverse.", damage: "2d6 PHYSIQUE" },
            { name: "Charge Héroïque", description: "Percute la ligne ennemie. Inflige des dégâts de PERCUSSION et RENVERSE les cibles légères.", damage: "1d10 PHYSIQUE" },
            { name: "Tourbillon", description: "Danse d'acier tournoyante. Inflige des dégâts TRANCHANTS massifs à chaque ennemi à portée de mêlée.", damage: "1d8 Zone" },
            { name: "Provocation", description: "Geste défiant forçant l'adversaire à vous cibler. Augmente la menace générée.", damage: "N/A" },
            { name: "Maîtrise Bouclier", description: "Utilise le bouclier comme arme. Inflige des dégâts CONTONDANTS et REPOUSSE l'ennemi de 3 mètres.", damage: "1d6 PHYSIQUE" }
        ]
    },
    "Mage": {
        desc: "Érudit des forces arcaniques, capable de tordre la réalité par la seule force de sa volonté.",
        reco: ["Intelligence", "Sagesse"],
        abilities: [
            { name: "Projectile Magique", description: "Trois dards d'énergie pure traquant leur cible. Inflige des dégâts de FORCE inévitables.", damage: "3x(1d4+1) FORCE" },
            { name: "Bouclier de Mana", description: "Champ de force hexagone. Absorbe les dégâts magiques ou cinétiques avant de se dissiper.", damage: "2d6 Protection" },
            { name: "Nova de Givre", description: "Explosion de froid absolu. Inflige des dégâts de FROID et IMMOBILISE les ennemis proches.", damage: "1d8 FROID" },
            { name: "Éclair", description: "Décharge électrique rectiligne. Inflige des dégâts de FOUDRE traversant toutes les armures métalliques.", damage: "3d6 FOUDRE" },
            { name: "Sommeil", description: "Nuage de poussière d'étoile. Endort les cibles dont les PV totaux sont inférieurs au jet de dés.", damage: "Sommeil (2 tours)" },
            { name: "Image Miroir", description: "Crée trois duplicatas illusoires. Augmente drastiquement les chances d'ESQUIVE du lanceur.", damage: "N/A" },
            { name: "Main de Mage", description: "Invoque une main spectrale pour manipuler des leviers ou dérober des objets à 10 mètres.", damage: "Utilité" },
            { name: "Sphère de Feu", description: "Boule de flammes roulante. Inflige des dégâts de FEU continus aux ennemis qu'elle traverse.", damage: "2d6 FEU" },
            { name: "Invisibilité", description: "Plie la lumière autour du corps. Rend le mage totalement indétectable jusqu'à sa prochaine attaque.", damage: "N/A" },
            { name: "Mur de Force", description: "Barrière invisible indestructible. Bloque tout passage physique et absorbe 100% des projectiles.", damage: "N/A" }
        ]
    },
    "Voleur": {
        desc: "Maître de l'ombre et de l'opportunisme, excellant dans l'art de frapper là où cela fait le plus mal.",
        reco: ["Dextérité", "Charisme"],
        abilities: [
            { name: "Attaque Sournoise", description: "Frappe chirurgicale. Inflige des dégâts de PRÉCISION massifs si la cible est distraite.", damage: "+2d6 PERFORANT" },
            { name: "Lame de l'Ombre", description: "Dague de ténèbres. Inflige des dégâts de NÉCROSE et rend le voleur difficile à cibler.", damage: "1d6 + Dex" },
            { name: "Esquive Rapide", description: "Torsion instinctive. Permet d'éviter totalement une attaque physique ennemie (Jet de Dex).", damage: "N/A" },
            { name: "Coup Bas", description: "Vise les tendons. Inflige des dégâts PHYSIQUES et réduit la vitesse de mouvement de 50%.", damage: "1d4 + Infirmité" },
            { name: "Disparition", description: "Bombe fumigène tactique. Permet de repasser en mode DISCRÉTION instantanément.", damage: "N/A" },
            { name: "Crochetage", description: "Manipulation experte. Ouvre serrures et désamorce pièges avec un bonus massif.", damage: "Utilité" },
            { name: "Poison Mortel", description: "Lame enduite de toxine. Inflige des dégâts de POISON cumulables à chaque seconde.", damage: "1d4 / tour" },
            { name: "Acrobatie", description: "Grâce inhumaine. Permet de franchir des obstacles élevés sans test de difficulté.", damage: "N/A" },
            { name: "Vol à la Tire", description: "Main agile. Dérobe un objet dans l'inventaire ennemi pendant le combat.", damage: "Loot" },
            { name: "Diversion", description: "Leurre sonore. Force les ennemis à regarder dans une direction opposée au voleur.", damage: "N/A" }
        ]
    },
    "Clerc": {
        desc: "Canal divin capable de miracles de guérison ou de châtiments célestes flamboyants.",
        reco: ["Sagesse", "Vitalité"],
        abilities: [
            { name: "Soin Lumineux", description: "Miracle sacré. Restaure les PV d'un allié en infusant de la lumière pure dans les chairs.", damage: "1d8 + Sag SOIN" },
            { name: "Bénédiction", description: "Grâce divine. Accorde un bonus de +1d4 à toutes les attaques et tests de sauvegarde alliés.", damage: "Support" },
            { name: "Marteau Sacré", description: "Arme de lumière céleste. Inflige des dégâts RADIANTS. Double les dégâts contre les morts-vivants.", damage: "1d10 RADIANT" },
            { name: "Repousser le Mal", description: "Onde de sainteté. Inflige des dégâts RADIANTS et fait fuir les démons et morts-vivants.", damage: "1d6 RADIANT" },
            { name: "Sanctuaire", description: "Aura protectrice. Empêche toute attaque directe contre une cible tant qu'elle ne blesse personne.", damage: "N/A" },
            { name: "Guidance", description: "Murmure divin. Accorde un bonus de +1 sur le prochain test de compétence d'un allié.", damage: "N/A" },
            { name: "Flamme Sacrée", description: "Feu tombant du ciel. Inflige des dégâts RADIANTS ignorant les bonus de couverture de l'ennemi.", damage: "1d8 RADIANT" },
            { name: "Mot de Rappel", description: "Appel de l'âme. Stabilise instantanément un allié mourant (0 PV) et le soigne légèrement.", damage: "Soin d'urgence" },
            { name: "Purification", description: "Dissipation sacrée. Retire tous les effets de POISON, MALADIE ou MALÉDICTION mineure.", damage: "N/A" },
            { name: "Lumière", description: "Orbe solaire. Illumine une zone de 10m et inflige un malus aux créatures sensibles à la lumière.", damage: "N/A" }
        ]
    },
    "Paladin": {
        desc: "Guerrier sacré lié par un serment inébranlable, bouclier vivant contre les ténèbres.",
        reco: ["Force", "Charisme"],
        abilities: [
            { name: "Châtiment Divin", description: "Explosion de foi. Inflige des dégâts RADIANTS massifs lors d'une frappe de mêlée réussie.", damage: "2d8 RADIANT" },
            { name: "Aura de Foi", description: "Présence protectrice. Augmente la RÉSISTANCE MAGIQUE de tous les alliés dans un rayon de 3m.", damage: "+2 Résistance" },
            { name: "Toucher Curatif", description: "Imposition des mains. Puise dans une réserve de foi pour soigner précisément un allié.", damage: "5 PV / niv" },
            { name: "Lame de Justice", description: "Acier béni. Inflige des dégâts TRANCHANTS et RADIANTS supplémentaires aux êtres impies.", damage: "1d8 + For + 1d4" },
            { name: "Défi Sacré", description: "Duel d'honneur. Force un ennemi à vous affronter. Inflige des dégâts RADIANTS s'il attaque un allié.", damage: "N/A" },
            { name: "Bouclier de Foi", description: "Égide éthérée. Entoure un allié d'un bouclier invisible augmentant sa Classe d'Armure de +2.", damage: "N/A" },
            { name: "Détection du Mal", description: "Sixième sens saint. Permet de localiser les démons et les morts-vivants à travers les murs.", damage: "N/A" },
            { name: "Châtiment Courroucé", description: "Frappe de terreur. Inflige des dégâts PSYCHIQUES et EFFRAIE la cible, la forçant à reculer.", damage: "1d6 PSYCHIQUE" },
            { name: "Serment de Vengeance", description: "Désignation de cible. Donne l'AVANTAGE sur tous les jets d'attaque contre un ennemi juré.", damage: "N/A" },
            { name: "Imposition des Mains", description: "Soin suprême. Miracle restaurant une énorme quantité de PV d'un seul contact.", damage: "Soin massif" }
        ]
    },
    "Rôdeur": {
        desc: "Chasseur solitaire et expert en survie, traquant sa proie dans les milieux hostiles.",
        reco: ["Dextérité", "Sagesse"],
        abilities: [
            { name: "Flèche Perçante", description: "Tir de puissance. Inflige des dégâts PERFORANTS traversant l'ennemi pour toucher celui derrière.", damage: "1d8 PHYSIQUE" },
            { name: "Marque Fatale", description: "Focus du prédateur. Chaque flèche inflige des dégâts de PRÉCISION supplémentaires à la cible marquée.", damage: "+1d6 PHYSIQUE" },
            { name: "Piège Naturel", description: "Ronces agrippantes. Inflige des dégâts de PERCUSSION et ENTRAVE la cible au sol.", damage: "1d4 + Immobilisation" },
            { name: "Salve Rapide", description: "Pluie de bois. Décoche deux flèches instantanément sur la même cible ou deux cibles proches.", damage: "2d6 PHYSIQUE" },
            { name: "Compagnon Animal", description: "Lien bestial. Invoque un loup ou un aigle pour attaquer. Inflige des dégâts TRANCHANTS.", damage: "Aide animalière" },
            { name: "Camouflage", description: "Fusion naturelle. Devient indétectable dans la végétation. Confère l'AVANTAGE en discrétion.", damage: "N/A" },
            { name: "Sens de la Bête", description: "Communion sauvage. Permet de voir à travers les yeux de son compagnon animal à distance.", damage: "N/A" },
            { name: "Flèche Enflammée", description: "Pointe incendiaire. Inflige des dégâts de FEU et peut embraser les cibles ou les structures.", damage: "1d8 FEU" },
            { name: "Pistage", description: "Lecture des signes. Identifie le type, le nombre et la fraîcheur des traces ennemies.", damage: "N/A" },
            { name: "Multi-Tir", description: "Déluge de projectiles. Tire trois flèches simultanément sur trois cibles différentes.", damage: "1d6 par cible" }
        ]
    },
    "Barde": {
        desc: "Maître des mots et de la musique, capable d'inspirer des armées ou de briser des esprits.",
        reco: ["Charisme", "Dextérité"],
        abilities: [
            { name: "Moquerie Cruelle", description: "Insulte spirituelle. Inflige des dégâts PSYCHIQUES et donne un MALUS au prochain test ennemi.", damage: "1d4 PSYCHIQUE" },
            { name: "Chant de Courage", description: "Harmonie héroïque. Accorde des PV temporaires à tous les alliés capables d'entendre.", damage: "1d6 PV temp." },
            { name: "Vague Sonore", description: "Accord dissonant. Inflige des dégâts de TONNERRE et REPOUSSE les cibles dans une zone de 5m.", damage: "2d6 TONNERRE" },
            { name: "Mélodie Captivante", description: "Berceuse hypnotique. CHARME une cible, la forçant à cesser toute hostilité pour 2 tours.", damage: "N/A" },
            { name: "Inspiration", description: "Encouragement lyrique. Ajoute un bonus de +1d6 au prochain test réussi d'un allié.", damage: "N/A" },
            { name: "Lumières Dansantes", description: "Orbes illusoires. Distrait les sentinelles ou illumine un large périmètre.", damage: "N/A" },
            { name: "Murmure Dissonant", description: "Voix cauchemardesque. Inflige des dégâts PSYCHIQUES forçant l'ennemi à fuir au loin.", damage: "2d6 PSYCHIQUE" },
            { name: "Rire de Tasha", description: "Blague magique. Force la cible à s'écrouler de rire, devenant INCAPABLE de bouger.", damage: "N/A" },
            { name: "Parole de Guérison", description: "Vers apaisants. Soigne un allié à vue sans avoir besoin de le toucher physiquement.", damage: "1d4 + Cha SOIN" },
            { name: "Silence", description: "Zone de mutisme. Empêche toute incantation de sort vocal dans un rayon de 6 mètres.", damage: "Anti-Magie" }
        ]
    },
    "Sorcier": {
        desc: "Lancier dont la puissance provient d'un pacte occulte avec une entité supérieure.",
        reco: ["Charisme", "Intelligence"],
        abilities: [
            { name: "Décharge Occulte", description: "Rayon eldritch. Inflige des dégâts de FORCE pure. Le sort le plus fiable du sorcier.", damage: "1d10 FORCE" },
            { name: "Faim de Hadar", description: "Vide sidéral. Crée une zone de ténèbres magiques. Inflige des dégâts de FROID et d'ACIDE.", damage: "2d6 FROID+ACIDE" },
            { name: "Lame de Pacte", description: "Arme invoquée. Crée une arme d'ombre infligeant des dégâts PSYCHIQUES basés sur le Charisme.", damage: "1d8 + Cha" },
            { name: "Malédiction", description: "Lien de douleur. Chaque attaque contre la cible inflige des dégâts de NÉCROSE supplémentaires.", damage: "+1d6 NÉCROSE" },
            { name: "Regard Fantôme", description: "Vision occulte. Permet de voir les créatures invisibles et de percevoir le plan éthéré.", damage: "N/A" },
            { name: "Pas Brumeux", description: "Saut dimensionnel. Téléporte instantanément le sorcier vers un lieu visible à 10 mètres.", damage: "N/A" },
            { name: "Bras de Hadar", description: "Tentacules d'ombre. Jaillissent du sorcier, infligeant des dégâts de NÉCROSE aux ennemis proches.", damage: "2d6 NÉCROSE" },
            { name: "Protection d'Agathys", description: "Givre spectral. Confère des PV temporaires et inflige des dégâts de FROID aux assaillants.", damage: "5 FROID" },
            { name: "Charme-Personne", description: "Infiltration mentale. Manipule l'opinion d'une cible humaine pour qu'elle devienne alliée.", damage: "N/A" },
            { name: "Serviteur Invisible", description: "Entité servile. Un valet de force invisible capable d'effectuer des tâches physiques simples.", damage: "Utilité" }
        ]
    },
    "Druide": {
        desc: "Gardien de l'équilibre sauvage, commandant aux forces de la nature et des éléments.",
        reco: ["Sagesse", "Intelligence"],
        abilities: [
            { name: "Forme Animale", description: "Métamorphose. Prend l'aspect d'un ours (force), loup (vitesse) ou corbeau (vol).", damage: "Varie par forme" },
            { name: "Épines du Sol", description: "Ronces acérées. Inflige des dégâts de POISON et ralentit tout mouvement ennemi.", damage: "2d4 POISON" },
            { name: "Appel de Foudre", description: "Colère céleste. Invoque un éclair massif infligeant des dégâts de FOUDRE sur une large zone.", damage: "3d10 FOUDRE" },
            { name: "Soin Sylvestre", description: "Rosée régénératrice. Soigne les blessures en utilisant l'énergie vitale de la terre.", damage: "1d6 + Sag SOIN" },
            { name: "Production de Flamme", description: "Feu druidique. Crée une flamme dans la paume pour éclairer ou être lancée (Dégâts de FEU).", damage: "1d8 FEU" },
            { name: "Amitié Animale", description: "Charme sauvage. Apaise une bête agressive et permet d'en faire une alliée temporaire.", damage: "N/A" },
            { name: "Peau d'Écorce", description: "Endurcissement. La peau devient dure comme le chêne. Augmente la Classe d'Armure à 16 fixe.", damage: "N/A" },
            { name: "Bourrasque", description: "Souffle de l'ouest. Vent violent infligeant des dégâts de FORCE et renversant les ennemis.", damage: "1d6 FORCE" },
            { name: "Entremêlement", description: "Racines vivantes. Enserre les pieds de tous les ennemis dans une zone ciblée.", damage: "Immobilisation" },
            { name: "Baies Nourricières", description: "Baies magiques. Chaque baie soigne 1 PV et nourrit une personne pour une journée entière.", damage: "1 PV / baie" }
        ]
    },
    "Moine": {
        desc: "Ascète martial canalisant son énergie vitale (Ki) pour des prouesses physiques surhumaines.",
        reco: ["Dextérité", "Sagesse"],
        abilities: [
            { name: "Déluge de Coups", description: "Rafale de Ki. Porte deux attaques à mains nues en un éclair. Dégâts CONTONDANTS.", damage: "2x(1d4+Dex)" },
            { name: "Paume de Ki", description: "Onde de choc interne. Inflige des dégâts de FORCE et propulse l'ennemi au loin.", damage: "1d6 FORCE" },
            { name: "Frappe Étourdissante", description: "Coup sur point névralgique. Inflige des dégâts PHYSIQUES et ÉTOURDIT la cible.", damage: "N/A" },
            { name: "Contre-Attaque", description: "Réflexe martial. Utilise l'élan ennemi pour dévier une attaque et riposter immédiatement.", damage: "1d8 PHYSIQUE" },
            { name: "Patience de Défense", description: "Transe de vigilance. Double les chances d'ESQUIVE et donne l'avantage aux jets de Dex.", damage: "N/A" },
            { name: "Bond de Ki", description: "Élan spirituel. Permet de sauter trois fois plus loin et plus haut que la normale.", damage: "N/A" },
            { name: "Esprit de Diamant", description: "Volonté d'acier. Immunise contre la PEUR et le CHARME pour toute la durée du combat.", damage: "N/A" },
            { name: "Mains de Guérison", description: "Transfert de Ki. Restaure les PV d'un allié en rééquilibrant ses flux d'énergie interne.", damage: "1d4 + Sag SOIN" },
            { name: "Coup à la Gorge", description: "Silence de la paume. Bloque la respiration ennemie, empêchant toute incantation vocale.", damage: "Silence" },
            { name: "Course sur les Murs", description: "Légèreté absolue. Permet de courir sur les parois verticales et l'eau calme.", damage: "Mobilité" }
        ]
    },
    "Nécromancien": {
        desc: "Maître de la mort et manipulateur de l'énergie vitale résiduelle des trépassés.",
        reco: ["Intelligence", "Vitalité"],
        abilities: [
            { name: "Toucher Glacial", description: "Froid de la tombe. Inflige des dégâts de NÉCROSE et empêche tout soin pour 1 tour.", damage: "1d8 NÉCROSE" },
            { name: "Explosion de Sang", description: "Détonation organique. Fait exploser un cadavre, infligeant des dégâts de NÉCROSE en zone.", damage: "2d8 NÉCROSE" },
            { name: "Moisson d'Âmes", description: "Siphon vital. Inflige des dégâts de NÉCROSE et soigne le lanceur d'une partie des dégâts.", damage: "1d6 Dgt / 1d4 Soin" },
            { name: "Rayon d'Affaiblissement", description: "Lumière spectrale. Réduit la FORCE de la cible, divisant ses dégâts physiques par deux.", damage: "Débuff" },
            { name: "Animation de Mort", description: "Servitude éternelle. Relève un squelette ou un zombie servile pour combattre à vos côtés.", damage: "Invoc" },
            { name: "Frayeur", description: "Vision macabre. Projette la mort de la cible dans son esprit. Inflige des dégâts PSYCHIQUES.", damage: "Peur" },
            { name: "Nuage de Brume", description: "Vapeur corrosive. Zone de gaz infligeant des dégâts d'ACIDE continus à quiconque s'y trouve.", damage: "1d6 ACIDE" },
            { name: "Lien de Douleur", description: "Malédiction de partage. 50% des dégâts subis par le nécromancien sont renvoyés à la cible.", damage: "N/A" },
            { name: "Mur d'Os", description: "Fortification macabre. Invoque une barrière d'ossements bloquant la vue et le passage.", damage: "N/A" },
            { name: "Servitude", description: "Domination spectrale. Prend le contrôle d'un mort-vivant ennemi de faible niveau.", damage: "N/A" }
        ]
    },
    "Barbare": {
        desc: "Force indomptable puisant une puissance titanesque dans une rage viscérale.",
        reco: ["Force", "Vitalité"],
        abilities: [
            { name: "Frappe Brutale", description: "Violence pure. Inflige des dégâts TRANCHANTS massifs en ignorant une partie de l'armure.", damage: "1d12+For+Rage" },
            { name: "Choc Sismique", description: "Séisme localisé. Frappe le sol, infligeant des dégâts de PERCUSSION et RENVERSANT les ennemis.", damage: "2d6 PHYSIQUE" },
            { name: "Rage", description: "Transe guerrière. Augmente les dégâts infligés et réduit de moitié les dégâts PHYSIQUES subis.", damage: "+4 DÉGÂTS" },
            { name: "Morsure d'Acier", description: "Entaille sanglante. Inflige des dégâts TRANCHANTS et un SAIGNEMENT continu pour 3 tours.", damage: "1d10 + Saignement" },
            { name: "Peau de Pierre", description: "Résistance innée. Réduit chaque source de dégâts PHYSIQUES reçue de 3 points fixes.", damage: "-3 Dégâts" },
            { name: "Saut de Lion", description: "Bond de prédateur. Saute sur une cible éloignée, infligeant des dégâts de PERCUSSION à l'impact.", damage: "1d6 PHYSIQUE" },
            { name: "Témérité", description: "Attaque désespérée. Donne l'AVANTAGE à l'attaque du barbare, mais aussi à ses ennemis contre lui.", damage: "N/A" },
            { name: "Menace Visuelle", description: "Regard de tueur. Effraie les ennemis dans un rayon de 5m, réduisant leur moral et leur précision.", damage: "Peur" },
            { name: "Double Hache", description: "Déchiquetage. Si équipé de deux armes, porte une attaque simultanée infligeant des dégâts TRANCHANTS.", damage: "2d8 PHYSIQUE" },
            { name: "Volonté de Fer", description: "Inébranlable. Si le barbare tombe à 0 PV sous l'effet de la rage, il survit avec 1 PV.", damage: "N/A" }
        ]
    }
};

const CLASSES = Object.keys(CLASS_DATA);

const STATS_CONFIG = [
    { id: 'Force', desc: "Puissance physique." },
    { id: 'Dextérité', desc: "Agilité et réflexes." },
    { id: 'Vitalité', desc: "Endurance et santé." },
    { id: 'Intelligence', desc: "Savoir et logique." },
    { id: 'Sagesse', desc: "Intuition et volonté." },
    { id: 'Charisme', desc: "Aura et éloquence." }
];

const StatControl = ({ name, value, desc, onUpdate, canAdd, canSub, isRecommended }) => html`
    <div className=${`stat-card border border-slate-700 rounded-xl p-3 flex flex-col justify-between gap-2 ${isRecommended ? 'recommended' : ''}`}>
        ${isRecommended && html`<div className="recommended-badge">Conseillé</div>`}
        <div className="flex justify-between items-start">
            <div className="flex flex-col">
                <span className="text-amber-500 font-bold text-sm tracking-tight">${name}</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-tighter leading-none">${desc}</span>
            </div>
            <span className="text-xl font-mono font-black text-white">${value}</span>
        </div>
        <div className="flex gap-1.5 mt-1">
            <button onClick=${() => onUpdate(-1)} disabled=${!canSub} className="flex-1 bg-slate-900 border border-slate-700 py-1.5 rounded-lg text-amber-500 hover:bg-slate-800 disabled:opacity-10 active:scale-90 transition-all text-lg font-bold">-</button>
            <button onClick=${() => onUpdate(1)} disabled=${!canAdd} className="flex-1 bg-slate-900 border border-slate-700 py-1.5 rounded-lg text-amber-500 hover:bg-slate-800 disabled:opacity-10 active:scale-90 transition-all text-lg font-bold">+</button>
        </div>
    </div>
`;

const App = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [race, setRace] = useState(RACES[0]);
    const [charClass, setCharClass] = useState(CLASSES[0]);
    const [combatStyle, setCombatStyle] = useState(COMBAT_STYLES[1].id);
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [hairType, setHairType] = useState('');
    const [hairColor, setHairColor] = useState('');
    const [eyeColor, setEyeColor] = useState('');
    const [userLore, setUserLore] = useState('');
    const [stats, setStats] = useState(() => STATS_CONFIG.reduce((acc, s) => ({ ...acc, [s.id]: 0 }), {}));
    const [allClassAbilities, setAllClassAbilities] = useState([]);
    const [selectedAbilitiesIndices, setSelectedAbilitiesIndices] = useState([]);
    const [selectedPositiveTalents, setSelectedPositiveTalents] = useState([]);
    const [selectedNegativeTalents, setSelectedNegativeTalents] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const defaultAbilities = (CLASS_DATA as any)[charClass].abilities;
        setAllClassAbilities(defaultAbilities.map((a: any) => ({ ...a })));
        setSelectedAbilitiesIndices([]); 
    }, [charClass]);

    const toggleAbilitySelection = (index: number) => {
        if (selectedAbilitiesIndices.includes(index)) {
            setSelectedAbilitiesIndices(selectedAbilitiesIndices.filter(i => i !== index));
        } else if (selectedAbilitiesIndices.length < MAX_SELECTED_ABILITIES) {
            setSelectedAbilitiesIndices([...selectedAbilitiesIndices, index]);
        }
    };

    const togglePositiveTalent = (id: string) => {
        if (selectedPositiveTalents.includes(id)) {
            setSelectedPositiveTalents(selectedPositiveTalents.filter(t => t !== id));
        } else if (selectedPositiveTalents.length < MAX_TALENT_PAIRS) {
            setSelectedPositiveTalents([...selectedPositiveTalents, id]);
        }
    };

    const toggleNegativeTalent = (id: string) => {
        if (selectedNegativeTalents.includes(id)) {
            setSelectedNegativeTalents(selectedNegativeTalents.filter(t => t !== id));
        } else if (selectedNegativeTalents.length < MAX_TALENT_PAIRS) {
            setSelectedNegativeTalents([...selectedNegativeTalents, id]);
        }
    };

    const handleAbilityChange = (index: number, field: string, value: string) => {
        const newAbilities = [...allClassAbilities];
        (newAbilities[index] as any)[field] = value;
        setAllClassAbilities(newAbilities);
    };

    const selectedAbilities = useMemo(() => {
        return selectedAbilitiesIndices.map(index => allClassAbilities[index]);
    }, [selectedAbilitiesIndices, allClassAbilities]);

    const talentsBalanced = selectedPositiveTalents.length === selectedNegativeTalents.length;
    const canGenerate = useMemo(() => {
        return firstName.trim() && 
               selectedAbilitiesIndices.length > 0 && 
               talentsBalanced;
    }, [firstName, selectedAbilitiesIndices, talentsBalanced]);

    const spentPoints = useMemo(() => Object.values(stats || {}).reduce((a: any, b: any) => (Number(a) || 0) + (Number(b) || 0), 0), [stats]);
    const remaining = MAX_POINTS - spentPoints;
    const selectedStyleLabel = useMemo(() => COMBAT_STYLES.find(s => s.id === combatStyle)?.label, [combatStyle]);

    const chartData = useMemo(() => (STATS_CONFIG || []).map(s => ({
        subject: s.id.substring(0, 3).toUpperCase(),
        A: (stats && (stats as any)[s.id]) || 0,
        fullMark: STAT_LIMIT
    })), [stats]);

    const downloadPdf = (lore: string) => {
        const doc = new jsPDF();
        const primaryColor = [245, 158, 11];
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(...primaryColor);
        doc.text("FORGE DE HÉROS", 105, 20, { align: "center" });
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("FICHE DE PERSONNAGE JDR", 105, 26, { align: "center" });
        doc.setDrawColor(...primaryColor);
        doc.line(20, 30, 190, 30);
        doc.setFontSize(26);
        doc.setTextColor(0, 0, 0);
        doc.text(`${firstName} ${lastName}`.trim(), 20, 45);
        doc.setFontSize(12);
        doc.setTextColor(80, 80, 80);
        doc.text(`Race: ${race} | Classe: ${charClass}`, 20, 52);
        
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.text("TALENTS", 20, 65);
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        let ty = 72;
        doc.setFont("helvetica", "bold");
        doc.text("Positifs:", 20, ty);
        doc.setFont("helvetica", "normal");
        selectedPositiveTalents.forEach(id => {
            const t = TALENTS_POSITIVE.find(x => x.id === id);
            doc.text(`- ${t.label}`, 40, ty);
            ty += 5;
        });
        ty += 2;
        doc.setFont("helvetica", "bold");
        doc.text("Négatifs:", 20, ty);
        doc.setFont("helvetica", "normal");
        selectedNegativeTalents.forEach(id => {
            const t = TALENTS_NEGATIVE.find(x => x.id === id);
            doc.text(`- ${t.label}`, 40, ty);
            ty += 5;
        });

        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.text("CAPACITÉS CHOISIES", 20, 110);
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        let cy = 118;
        selectedAbilities.forEach((ab: any) => {
            doc.setFont("helvetica", "bold");
            doc.text(`${ab.name} [${ab.damage}]`, 20, cy);
            doc.setFont("helvetica", "normal");
            const lines = doc.splitTextToSize(ab.description, 150);
            doc.text(lines, 20, cy + 5);
            cy += 8 + (5 * lines.length);
        });

        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.text("ATTRIBUTS", 20, 200);
        let y = 208;
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        Object.entries(stats || {}).forEach(([key, val]) => {
            doc.setFont("helvetica", "bold");
            doc.text(`${key}:`, 25, y);
            doc.setFont("helvetica", "normal");
            doc.text(`${val}`, 65, y);
            y += 8;
        });

        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.text("HISTOIRE DU HÉROS", 20, 260);
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(50, 50, 50);
        const splitLore = doc.splitTextToSize(lore || "L'histoire de ce héros n'a pas encore été écrite...", 170);
        doc.text(splitLore, 20, 268);
        
        doc.save(`${firstName || 'Hero'}_Codex.pdf`);
    };

    const downloadJson = () => {
        const charData = {
            firstName,
            lastName,
            race,
            charClass,
            combatStyle: selectedStyleLabel,
            physical: { height, weight, hairType, hairColor, eyeColor },
            stats,
            talents: {
                positive: selectedPositiveTalents.map(id => TALENTS_POSITIVE.find(t => t.id === id)),
                negative: selectedNegativeTalents.map(id => TALENTS_NEGATIVE.find(t => t.id === id)),
            },
            abilities: selectedAbilities,
            origins: userLore
        };
        const blob = new Blob([JSON.stringify(charData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${firstName || 'Hero'}_Data.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const generateCharacter = async () => {
        if (!canGenerate) return;
        setLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const statsDesc = Object.entries(stats || {}).map(([k,v])=>`${k}:${v}`).join(', ');
            const abilitiesDesc = selectedAbilities.map((a: any) => `${a.name} (${a.description}, Dégâts: ${a.damage})`).join(', ');
            const posTalentsDesc = selectedPositiveTalents.map(id => TALENTS_POSITIVE.find(t => t.id === id).label).join(', ');
            const negTalentsDesc = selectedNegativeTalents.map(id => TALENTS_NEGATIVE.find(t => t.id === id).label).join(', ');
            
            const prompt = `Génère une biographie JDR immersive de 180 mots max en français.
                Héros: ${firstName} ${lastName} (${race} ${charClass})
                Talents innés: ${posTalentsDesc}
                Fardeaux/Faiblesses: ${negTalentsDesc}
                Style de combat: ${selectedStyleLabel}
                Capacités: ${abilitiesDesc}
                Apparence: ${height}cm, ${weight}kg, yeux ${eyeColor}, cheveux ${hairColor}
                Stats: ${statsDesc}
                Note: Explique comment ses talents positifs l'aident mais comment ses fardeaux négatifs le limitent ou créent du drame. Respecte les types de dégâts des capacités.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt
            });
            
            const loreText = response.text || "L'épopée de ce héros commence...";
            downloadPdf(loreText);
        } catch (e) {
            console.error(e);
            downloadPdf("Le destin est flou, mais la volonté du héros est intacte.");
        } finally {
            setLoading(false);
        }
    };

    const updateStat = (id, delta) => {
        setStats(p => {
            const currentVal = (p as any)[id] || 0;
            const newVal = currentVal + delta;
            if (newVal < 0 || newVal > STAT_LIMIT) return p;
            if (delta > 0 && remaining <= 0) return p;
            return { ...p, [id]: newVal };
        });
    };

    return html`
        <div className="flex-1 w-full bg-[#020617] p-4 md:p-8 lg:p-12">
            <header className="text-center mb-12">
                <h1 className="medieval-font text-6xl md:text-8xl text-amber-500 mb-3 drop-shadow-2xl">Forge de Héros</h1>
                <p className="text-slate-400 font-medium italic text-lg tracking-wider">Équilibre ton âme avant de forger ta lame.</p>
            </header>

            <main className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-8 space-y-8">
                    <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl space-y-6 backdrop-blur-xl shadow-2xl">
                        <h2 className="medieval-font text-2xl text-amber-500 border-b border-amber-500/20 pb-3">Identité & Classe</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input value=${firstName} onChange=${e => setFirstName((e.target as HTMLInputElement).value)} className="w-full rounded-2xl px-5 py-3 outline-none placeholder:text-slate-600 text-lg" placeholder="Prénom"/>
                            <input value=${lastName} onChange=${e => setLastName((e.target as HTMLInputElement).value)} className="w-full rounded-2xl px-5 py-3 outline-none placeholder:text-slate-600 text-lg" placeholder="Nom"/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">Race</label>
                                <select value=${race} onChange=${e => setRace((e.target as HTMLSelectElement).value)} className="custom-select w-full rounded-2xl px-5 py-3 outline-none cursor-pointer text-lg">
                                    ${RACES.map(r => html`<option key=${r} value=${r}>${r}</option>`)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">Classe</label>
                                <select value=${charClass} onChange=${e => setCharClass((e.target as HTMLSelectElement).value)} className="custom-select w-full rounded-2xl px-5 py-3 outline-none cursor-pointer text-lg">
                                    ${CLASSES.map(c => html`<option key=${c} value=${c}>${c}</option>`)}
                                </select>
                            </div>
                        </div>
                        <div className="bg-slate-950/40 border border-slate-800/50 p-5 rounded-2xl animate-slide-in">
                            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500/50 animate-pulse"></span>
                                À propos de la classe ${charClass}
                            </h3>
                            <p className="text-sm text-slate-400 italic leading-relaxed">
                                ${(CLASS_DATA as any)[charClass].desc}
                            </p>
                        </div>
                    </section>

                    <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl space-y-6 backdrop-blur-xl shadow-2xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h2 className="medieval-font text-2xl text-amber-500">Talents & Fardeaux</h2>
                            <div className=${`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${talentsBalanced ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-rose-500/10 border-rose-500/50 text-rose-500'}`}>
                                ⚖️ Équilibre : ${selectedPositiveTalents.length} Pos / ${selectedNegativeTalents.length} Neg
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 italic">Règle : Chaque talent positif choisi nécessite un fardeau négatif (Max 3 paires).</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest flex justify-between">
                                    <span>Talents Positifs</span>
                                    <span className="opacity-50">${selectedPositiveTalents.length}/3</span>
                                </h3>
                                <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                    ${TALENTS_POSITIVE.map(t => html`
                                        <button 
                                            key=${t.id}
                                            onClick=${() => togglePositiveTalent(t.id)}
                                            className=${`text-left p-3 rounded-xl border text-xs transition-all ${selectedPositiveTalents.includes(t.id) ? 'bg-emerald-500/20 border-emerald-500 text-emerald-100' : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                                        >
                                            <div className="font-bold uppercase">${t.label}</div>
                                            <div className="text-[10px] opacity-60 mt-0.5">${t.desc}</div>
                                        </button>
                                    `)}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest flex justify-between">
                                    <span>Fardeaux Négatifs</span>
                                    <span className="opacity-50">${selectedNegativeTalents.length}/3</span>
                                </h3>
                                <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                    ${TALENTS_NEGATIVE.map(t => html`
                                        <button 
                                            key=${t.id}
                                            onClick=${() => toggleNegativeTalent(t.id)}
                                            className=${`text-left p-3 rounded-xl border text-xs transition-all ${selectedNegativeTalents.includes(t.id) ? 'bg-rose-500/20 border-rose-500 text-rose-100' : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                                        >
                                            <div className="font-bold uppercase">${t.label}</div>
                                            <div className="text-[10px] opacity-60 mt-0.5">${t.desc}</div>
                                        </button>
                                    `)}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-amber-500/5 border border-amber-500/10 p-8 rounded-3xl animate-slide-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="medieval-font text-2xl text-amber-500">Capacités (${selectedAbilitiesIndices.length}/${MAX_SELECTED_ABILITIES})</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            ${allClassAbilities.map((ability: any, index: number) => {
                                const isSelected = selectedAbilitiesIndices.includes(index);
                                return html`
                                    <div 
                                        key=${index} 
                                        onClick=${() => toggleAbilitySelection(index)}
                                        className=${`cursor-pointer p-4 rounded-2xl border transition-all ${isSelected ? 'bg-amber-500/10 border-amber-500' : 'bg-slate-950/40 border-slate-800 hover:border-slate-600'}`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className=${`text-xs font-bold uppercase ${isSelected ? 'text-amber-500' : 'text-slate-400'}`}>${ability.name}</span>
                                            ${isSelected && html`<span className="text-amber-500">✓</span>`}
                                        </div>
                                        <div className="text-[9px] text-slate-600 font-mono mb-1">${ability.damage}</div>
                                        <div className="text-[10px] text-slate-500 italic line-clamp-2 leading-tight">${ability.description}</div>
                                    </div>
                                `;
                            })}
                        </div>
                    </section>

                    <div className="flex flex-col md:flex-row gap-4">
                        <button 
                            onClick=${generateCharacter} 
                            disabled=${loading || !canGenerate} 
                            className=${`flex-1 py-6 text-slate-950 font-black text-2xl rounded-3xl shadow-2xl active:scale-[0.99] transition-all uppercase tracking-[0.2em] ${canGenerate ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                        >
                            ${loading ? 'Consultation des Astres...' : !talentsBalanced ? 'Déséquilibre de Destinée' : 'Générer la fiche (PDF)'}
                        </button>
                        
                        <button 
                            onClick=${downloadJson} 
                            disabled=${loading || !canGenerate} 
                            className=${`py-6 px-10 text-amber-500 font-bold text-lg rounded-3xl border border-amber-500/30 hover:bg-amber-500/10 active:scale-[0.99] transition-all uppercase tracking-widest disabled:opacity-20`}
                        >
                            JSON
                        </button>
                    </div>
                </div>

                <div className="xl:col-span-4 space-y-8">
                    <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl h-fit sticky top-6">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="medieval-font text-2xl text-amber-500">Attributs</h2>
                            <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-2xl flex items-center gap-3">
                                <span className="text-amber-500 font-mono font-bold text-2xl">${remaining}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            ${(STATS_CONFIG || []).map(s => html`
                                <${StatControl} 
                                    key=${s.id} 
                                    name=${s.id} 
                                    desc=${s.desc} 
                                    value=${(stats && (stats as any)[s.id]) || 0} 
                                    isRecommended=${(CLASS_DATA as any)[charClass].reco.includes(s.id)}
                                    canSub=${stats && (stats as any)[s.id] > 0} 
                                    canAdd=${remaining > 0 && ((stats as any)[s.id] || 0) < STAT_LIMIT} 
                                    onUpdate=${(delta) => updateStat(s.id, delta)} 
                                />
                            `)}
                        </div>
                        <div className="h-[300px] w-full mt-8 border border-slate-800/50 rounded-2xl p-4 bg-slate-950/20">
                            <${ResponsiveContainer} width="100%" height="100%">
                                <${RadarChart} data=${chartData}>
                                    <${PolarGrid} stroke="#1e293b" />
                                    <${PolarAngleAxis} dataKey="subject" tick=${{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                                    <${Radar} name="Stats" dataKey="A" stroke="#f59e0b" strokeWidth=${3} fill="#f59e0b" fillOpacity=${0.45} />
                                </${RadarChart}>
                            </${ResponsiveContainer} >
                        </div>
                    </section>
                </div>
            </main>

            <footer className="mt-20 py-12 text-center border-t border-slate-800/30">
                <p className="text-[10px] uppercase tracking-[1em] text-slate-600 font-bold">Forge de Héros • Codex Digital v4.0 • Direct Extraction Edition</p>
            </footer>
        </div>
    `;
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(html`<${App} />`);
}
