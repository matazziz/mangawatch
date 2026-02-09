// Vérification session "rester connecté" : si non cochée, déconnecter à la fermeture du navigateur
(function checkSession() {
    try {
        const rememberMe = localStorage.getItem('rememberMe');
        const sessionActive = sessionStorage.getItem('mangawatch_session_active');
        if (rememberMe === 'false' && !sessionActive) {
            localStorage.removeItem('user');
            localStorage.removeItem('isLoggedIn');
        }
    } catch (e) { /* ignore */ }
})();

// Système de localisation pour MangaWatch
class Localization {
    constructor() {
        // Uniquement la langue choisie dans l'app (mangaWatchLanguage). Défaut fr (pas user.language pour éviter anglais non voulu).
        const savedLanguage = localStorage.getItem('mangaWatchLanguage');
        this.currentLanguage = savedLanguage || 'fr';
        console.log(`🌍 Langue initialisée: ${this.currentLanguage}`);
        
        // Appliquer les classes de langue si nécessaire lors de l'initialisation
        if (this.currentLanguage === 'ja' || this.currentLanguage === 'de') {
            // Attendre que le DOM soit prêt
            if (document.body) {
                if (this.currentLanguage === 'ja') {
                    document.body.classList.add('lang-ja');
                    document.documentElement.setAttribute('lang', 'ja');
                } else if (this.currentLanguage === 'de') {
                    document.body.classList.add('lang-de');
                    document.documentElement.setAttribute('lang', 'de');
                }
            } else {
                // Si le body n'est pas encore chargé, attendre
                document.addEventListener('DOMContentLoaded', () => {
                    if (this.currentLanguage === 'ja') {
                        document.body.classList.add('lang-ja');
                        document.documentElement.setAttribute('lang', 'ja');
                    } else if (this.currentLanguage === 'de') {
                        document.body.classList.add('lang-de');
                        document.documentElement.setAttribute('lang', 'de');
                    }
                });
            }
        }
        
        this.translations = {
            fr: {
                // Navigation essentielle
                'nav.home': 'Accueil',
                'nav.manga_anime': 'Mangas & Anime',
                'nav.collection': 'Collection',
                'nav.profile': 'Profil',
                'nav.tierlist': 'Tier List',
                'nav.forum': 'Forum',
                
                // Titres de pages essentiels
                'catalogue.title.manga': 'Mangas',
                'catalogue.title.anime': 'Animes',
                'collection.title': 'Ma Collection',
                'collection.subtitle': 'Gérez vos mangas et animes préférés',
                
                // Filtres essentiels
                'type': 'Type',
                'status': 'Statut',
                'sort': 'Trier par',
                'reset': 'Réinitialiser',
                
                // Options de filtre essentielles
                'manga': 'Manga',
                'anime': 'Anime',
                'novel': 'Roman',
                'doujin': 'Doujin',
                'manhwa': 'Manhwa',
                'manhua': 'Manhua',
                'all_status': 'Tous les statuts',
                'watching': 'En cours',
                'completed': 'Terminé',
                'on_hold': 'En pause',
                'dropped': 'Abandonné',
                'plan_to_watch': 'À voir',
                'score': 'Meilleure note',
                'popularity': 'Plus populaires',
                'genre_sort': 'Trier par genre',
                'no_synopsis_available': 'Aucune description disponible',
                
                // Types d'anime
                'anime_type': 'Type d\'anime',
                'all_anime_types': 'Tous les types d\'anime',
                'tv': 'Anime',
                'movie': 'Film',
                'ova': 'OVA',
                'special': 'Spécial',
                'ona': 'ONA',
                'music': 'Vidéo musicale',
                
                // Autres options
                'rating': 'Note minimale',
                'relevance': 'Pertinence',
                'title': 'Ordre alphabétique',
                'start_date': 'Date de sortie',
                
                // Pagination
                'pagination.previous': 'Précédent',
                'pagination.next': 'Suivant',
                
                // Modal de statut
                'collection.status_modal.title': 'Choisir un statut',
                'collection.status.watching': 'En cours',
                'collection.status.completed': 'Terminé',
                'collection.status.on_hold': 'En pause',
                'collection.status.dropped': 'Abandonné',
                'collection.status.plan_to_watch': 'À voir',
                
                // Messages essentiels
                'message.loading': 'Chargement...',
                'message.error': 'Une erreur est survenue',
                'message.no_results': 'Aucun résultat trouvé',
                
                // Barre de recherche
                'search.placeholder': 'Rechercher un anime ou un manga...',
                
                // Collection essentielle
                'collection.filter.all': 'Tous',
                'collection.filter.watching': 'En cours',
                'collection.filter.completed': 'Terminé',
                'collection.filter.on_hold': 'En pause',
                'collection.filter.dropped': 'Abandonné',
                'collection.filter.plan_to_watch': 'À voir',
                'user_profile.tab_anime_manga': 'Anime & Manga',
                'user_profile.tab_collection': 'Collection',
                'user_profile.empty_title': 'Aucun élément dans cette collection',
                'user_profile.empty_text': 'Commencez à ajouter des animes et mangas à votre collection !',
                'user_profile.user_not_found': 'Utilisateur introuvable',
                'user_profile.user_not_found_desc': 'L\'utilisateur que vous recherchez n\'existe pas.',
                'user_profile.back_home': 'Retour à l\'accueil',
                'user_profile.no_cards': 'Aucune carte à afficher.',
                'collection.type.all': 'Tous les types',
                'collection.type.anime': 'Anime',
                'collection.type.manga': 'Manga',
                'collection.type.novel': 'Roman',
                'collection.type.roman': 'Roman',
                'collection.type.doujin': 'Doujin',
                'collection.type.manhwa': 'Manhwa',
                'collection.type.manhua': 'Manhua',
                'collection.type.film': 'Film',
                'collection.label_episodes': 'épisodes',
                'collection.label_volumes': 'volumes',
                'collection.stats.watching': 'En cours',
                'collection.stats.completed': 'Terminé',
                'collection.stats.on_hold': 'En pause',
                'collection.stats.dropped': 'Abandonné',
                'collection.stats.plan_to_watch': 'À voir',
                
                // Page d'accueil
                'home.hero_subtitle': 'Votre destination ultime pour suivre et noter vos animes et mangas préférés',
                'home.explore': 'Explorer la collection',
                'home.why_choose': 'Pourquoi choisir MangaWatch ?',
                'home.feature_catalogue_title': 'Catalogue Complet',
                'home.feature_catalogue_desc': 'Accédez à une vaste collection d\'animes et de mangas, des classiques intemporels aux dernières sorties.',
                'home.feature_rating_title': 'Notation Intelligente',
                'home.feature_rating_desc': 'Notez et évaluez vos œuvres préférées pour aider la communauté à découvrir des pépites.',
                'home.feature_tierlist_title': 'Tier Lists Personnalisées',
                'home.feature_tierlist_desc': 'Créez et partagez vos propres classements d\'animes et de personnages.',
                
                // Auteur de la semaine
                'home.author_of_week': 'Auteur de la semaine',
                'home.author_bio': 'Biographie',
                'home.author_works': 'Œuvres principales',
                'home.author_follow': 'Suivre',
                'home.author_unfollow': 'Ne plus suivre',
                'home.author_featured': 'À la une :',
                'home.author_major_works': 'Œuvres majeures',
                
                // Vote du jour
                'home.vote_title': 'Vote pour l\'anime que tu trouves le meilleur aujourd\'hui !',
                'home.vote_title_manga': 'Vote pour le manga que tu trouves le meilleur aujourd\'hui !',
                'home.vote_type_anime': 'Vote du jour : Anime',
                'home.vote_type_manga': 'Vote du jour : Manga',
                'home.vote_button': 'Voter',
                'home.vote_voted': '✓ Voté',
                'home.vote_already_voted': 'Déjà voté',
                'home.vote_votes': 'vote',
                'home.vote_votes_plural': 'votes',
                'home.vote_already_voted_message': 'Vous avez déjà voté aujourd\'hui ! Revenez demain pour voter à nouveau.',
                
                // Section Vote du Jour
                'home.vote_of_day': 'Vote du Jour',
                'home.vote_description': 'Quel anime/manga préférez-vous aujourd\'hui ?',
                'home.vote_results': 'Résultats du vote',
                'home.vote_new_vote': 'Nouveau vote',
                'home.vote_already_voted_today': 'Vous avez déjà voté aujourd\'hui !',
                'home.vote_reset_tomorrow': 'Vous pouvez réinitialiser le vote demain !',
                
                // Nouveaux membres
                'home.new_members': 'Nouveaux membres',
                
                // Quiz du jour
                'home.quiz_title': 'Quiz du jour',
                'home.quiz_validate': 'Valider ma réponse',
                'home.quiz_correct': 'Correct !',
                'home.quiz_incorrect': 'Incorrect !',
                'home.quiz_correct_answer': 'La bonne réponse était :',
                'home.quiz_continue': 'Continuer',
                'home.quiz_select_answer': 'Veuillez sélectionner une réponse !',
                'home.quiz_question_progress': 'Question {current} sur {total} • Nouvelle question demain !',
                'home.quiz_error': 'Impossible de charger le quiz pour le moment.',
                
                // Nouveaux utilisateurs
                'home.new_users': 'Nouveaux utilisateurs',
                'home.new_users_error': 'Impossible de charger les nouveaux utilisateurs pour le moment.',
                'home.new_users_error_retry': 'Veuillez réessayer plus tard.',
                'home.new_users_stat_animes': 'Animes',
                'home.new_users_stat_mangas': 'Mangas',
                'home.new_users_stat_tierlists': 'Tier Lists',
                'home.new_users_join_days_ago': 'Il y a {days} jours',
                'home.new_users_join_week_ago': 'Il y a 1 semaine',
                'home.new_users_join_weeks_ago': 'Il y a {weeks} semaines',
                
                // Popup d'authentification
                'home.welcome_title': 'Bienvenue sur MangaWatch !',
                'home.welcome_login': 'Se connecter',
                'home.welcome_register': 'S\'inscrire',
                
                // Recherche
                'search.placeholder.manga': 'Rechercher un manga...',
                'search.placeholder.anime': 'Rechercher un anime...',
                'search.placeholder.movie': 'Rechercher un film...',
                'search.placeholder.manhwa': 'Rechercher un manhwa...',
                'search.placeholder.manhua': 'Rechercher un manhua...',
                'search.placeholder.user': 'Rechercher un utilisateur...',
                'search.placeholder.generic': 'Rechercher...',
                'search.aria_label': 'Rechercher',
                'search.clear_aria': 'Effacer la recherche',
                
                // Options de recherche
                'search.type.manga': 'Manga',
                'search.type.anime': 'Anime',
                'search.type.movie': 'Film',
                'search.type.manhwa': 'Manhwa',
                'search.type.manhua': 'Manhua',
                'search.type.user': 'Utilisateur',
                'search.results_for': 'Résultats de recherche pour "{query}" ({count})',
                'search.results_for_genre': 'Résultats de recherche pour le genre "{genre}" pour "{query}" ({count})',
                'search.no_results_genre': 'Aucun résultat trouvé pour le genre "{genre}" pour "{query}"',
                'search.no_results': 'Aucun résultat trouvé pour "{query}"',
                'search.result_one': '1 résultat',
                'search.result_many': '{n} résultats',
                'common.pagination_prev': '← Précédent',
                'common.pagination_next': 'Suivant →',
                'genre.of_genre': 'du genre :',
                'genre.type_label': 'Type :',
                'genre.content_mangas': 'Mangas',
                'genre.content_animes': 'Animes',
                'genre.content_films': 'Films',
                'genre.content_contents': 'Contenus',
                'genre.content_manhwa': 'Manhwas',
                'genre.content_manhua': 'Manhuas',
                'genre.content_all': 'Tous',
                'profile.rating_label': 'Note',
                'profile.not_rated': 'Non noté',
                'common.scroll_bottom': '↓ Bas',
                'common.scroll_top': '↑ Haut',
                'common.scroll_bottom_title': 'Descendre en bas de la page',
                'common.scroll_top_title': 'Remonter en haut de la page',
                
                // Messages généraux
                'common.loading': 'Chargement...',
                'common.loading_vote_options': 'Chargement des options de vote...',
                'common.message': 'Message',
                'common.message_content': 'Contenu du message',
                'common.understood': 'Compris',
                'common.avatar_user': 'Avatar utilisateur',
                'common.description_unavailable': 'Description non disponible.',
                'common.image_unavailable': 'Image non disponible',
                'common.avatar_unavailable': 'Avatar non disponible',
                'common.image_not_loaded': 'Image non chargée',
                'common.poster_of': 'Affiche de',
                'common.avatar_of': 'Avatar de',
                
                // Vote du jour (détails)
                'home.vote_description_template': 'Quel {type} préférez-vous aujourd\'hui ?',
                'home.vote_type_badge_anime': 'Vote du jour : Anime',
                'home.vote_type_badge_manga': 'Vote du jour : Manga',
                'home.vote_button_text': 'Voter',
                'home.vote_count': 'votes',
                'home.vote_already_done_title': 'Vote déjà effectué',
                'home.vote_already_done_message': 'Vous avez déjà voté aujourd\'hui ! Vous pourrez voter à nouveau demain.',
                'home.logout_title': '👋 Déconnexion',
                'home.logout_message': 'Vous avez été déconnecté avec succès',
                'home.vote_new_votes_notification': 'nouveau(x) vote(s) !',
                
                // Footer
                'footer.copyright': '©',
                'footer.all_rights_reserved': 'Tous droits réservés',
                'footer.made_by': 'Made by',
                
                // Aide / Tickets
                'help.title': 'Aide - Signaler un problème',
                'help.ticket_title': 'Aide - Signaler un problème',
                'help.ticket_subject': 'Sujet',
                'help.ticket_message': 'Décrivez votre problème',
                'help.ticket_send': 'Envoyer le ticket',
                'help.ticket_cancel': 'Annuler',
                'help.close': 'Fermer',
                'help.ticket_success': 'Votre ticket a bien été envoyé. Nous vous répondrons si nécessaire.',
                'help.ticket_error': 'Une erreur est survenue. Contactez-nous à mangawatch.off@gmail.com',
                'help.ticket_login': 'Connectez-vous pour envoyer un ticket, ou envoyez-nous un email à mangawatch.off@gmail.com',
                'help.my_tickets': 'Mes tickets',
                'help.new_ticket': 'Nouveau ticket',
                'help.placeholder_subject': 'Ex: Problème de connexion, bug sur la page collection...',
                'help.placeholder_message': 'Décrivez le problème en détail...',
                'help.loading': 'Chargement…',
                'help.loading_tickets': 'Chargement de vos tickets…',
                'help.login_to_see': 'Connectez-vous pour voir et gérer vos tickets.',
                'help.service_unavailable': 'Service indisponible.',
                'help.no_tickets': 'Vous n\'avez aucun ticket. Créez-en un avec l\'onglet « Nouveau ticket ».',
                'help.closed': 'Fermé',
                'help.in_progress': 'En cours',
                'help.no_subject': 'Sans sujet',
                'help.back_to_list': 'Retour à la liste',
                'help.your_message': 'Votre message',
                'help.support': 'Support',
                'help.you': 'Vous',
                'help.your_reply': 'Votre réponse',
                'help.send_reply': 'Envoyer',
                'help.close_ticket_btn': 'Fermer le ticket',
                'help.conversation_closed': 'Conversation fermée',
                'help.conversation_closed_desc': 'Ce ticket ne peut plus recevoir de réponses. Vous pouvez uniquement consulter l\'historique ci-dessus.',
                'help.close_ticket_confirm_title': 'Fermer ce ticket ?',
                'help.close_ticket_confirm_desc': 'Une fois fermé, vous ne pourrez plus répondre. La conversation restera visible en lecture seule.',
                'help.close_ticket_confirm_btn': 'Fermer le ticket',
                'help.ticket_closed_toast': 'Ticket fermé. La conversation reste visible en lecture seule.',
                'help.reply_sent': 'Réponse envoyée.',
                'help.reply_to_your_ticket': 'Réponse à votre ticket',
                'help.reply_error': 'Erreur lors de l\'envoi.',
                'help.close_error': 'Erreur lors de la fermeture.',
                'help.load_error': 'Impossible de charger vos tickets. Réessayez plus tard.',
                'help.load_error_index': 'Configuration requise : déployez les index Firestore puis réessayez.',
                'help.load_error_permission': 'Accès refusé. Vérifiez que vous êtes connecté avec le compte associé à vos tickets.',
                'help.tickets_not_enabled_confirm': 'Les tickets ne sont pas encore activés côté serveur. Voulez-vous ouvrir votre logiciel de messagerie pour nous envoyer un email ?',
                
                // Messagerie (popup)
                'messaging.title': 'Messages',
                'messaging.aria_label': 'Messages',
                'messaging.loading': 'Chargement des messages...',
                'messaging.empty': 'Aucun message pour le moment',
                'messaging.back': 'Retour',
                'messaging.mark_all_read': 'Marquer tout comme lu',
                'messaging.load_error': 'Erreur lors du chargement des messages',
                'messaging.delete_error': 'Erreur lors de la suppression du message.',
                'messaging.delete': 'Supprimer',
                'messaging.delete_confirm_title': 'Supprimer le message',
                'messaging.delete_confirm_body': 'Êtes-vous sûr de vouloir supprimer ce message ?',
                'messaging.delete_irreversible': 'Cette action est irréversible.',
                'messaging.cancel': 'Annuler',
                'messaging.type.info': 'Information',
                'messaging.type.warning': 'Avertissement',
                'messaging.type.ban': 'Bannissement',
                'messaging.type.thank': 'Remerciement',
                'messaging.type.global': 'Annonce globale',
                
                // Profil (page profil)
                'profile.search_placeholder': 'Rechercher un manga...',
                'profile.search_manga': 'Manga',
                'profile.search_anime': 'Anime',
                'profile.search_movie': 'Film',
                'profile.search_user': 'Utilisateur',
                'profile.search_aria': 'Rechercher',
                'profile.menu_aria': 'Menu',
                'profile.avatar_alt': 'Avatar utilisateur',
                'profile.followers': 'Abonnés',
                'profile.following': 'Abonnements',
                'profile.subscribe': 'S\'abonner',
                'profile.subscribed': 'Abonné',
                'profile.add_to_top10': 'Ajouter au top 10',
                'profile.top10_choose_slot': 'Choisissez un emplacement pour "{{title}}" dans votre Top 10',
                'profile.top10_slot_empty': 'Vide',
                'profile.top10_move': 'Déplacer',
                'profile.top10_remove': 'Retirer',
                'profile.top10_place_hint': 'Cliquez sur "..." puis sur le bouton pour ajouter au top 10',
                'profile.top10_no_card_selected': 'Aucune carte sélectionnée. Veuillez réessayer.',
                'profile.top10_must_be_logged_in': 'Vous devez être connecté pour ajouter au top 10.',
                'profile.top10_card_no_longer_exists': 'La carte sélectionnée n\'existe plus. Veuillez réessayer.',
                'profile.top10_save_error': 'Impossible de sauvegarder le top 10. Veuillez réessayer.',
                'profile.top10_display_error': 'Erreur lors de l\'affichage de l\'interface top 10.',
                'profile.description_placeholder': 'Écrivez votre description ici...',
                'profile.edit_description': 'Modifier la description',
                'profile.certified_account': 'Compte certifié',
                'profile.banner_alt': 'Bannière du profil',
                'profile.not_set': 'Non renseigné',
                'profile.no_description': 'Aucune description',
                'profile.edit_banner': 'Modifier la bannière',
                'profile.choose_image': 'Choisir une image',
                'profile.choose_video': 'Choisir une vidéo',
                'profile.mute_sound': 'Couper le son',
                'profile.remove_banner': 'Supprimer la bannière',
                'profile.close': 'Fermer',
                'profile.tab_anime_manga': 'Anime & Manga',
                'profile.tab_settings': 'Paramètres',
                'profile.settings_title': 'Paramètres',
                'profile.preferences': 'Préférences',
                'profile.profile_photo': 'Photo de profil',
                'profile.banner_label': 'Bannière du profil',
                'profile.banner_video_volume': 'Volume de la bannière vidéo',
                'profile.modify': 'Modifier',
                'profile.theme': 'Thème',
                'profile.theme_dark': 'Sombre',
                'profile.theme_light': 'Clair',
                'profile.privacy_subscriptions': 'Confidentialité des abonnements',
                'profile.hide_subscriptions': 'Masquer mes abonnements aux autres utilisateurs',
                'profile.account_info': 'Informations du compte',
                'profile.pseudo': 'Pseudo',
                'profile.email': 'Adresse email',
                'profile.save': 'Enregistrer',
                'profile.cancel': 'Annuler',
                'profile.reveal_email': 'Afficher l\'email',
                'profile.edit_email': 'Modifier l\'email',
                'profile.edit_password': 'Modifier le mot de passe',
                'profile.new_password': 'Nouveau mot de passe',
                'profile.confirm_password': 'Confirmer le mot de passe',
                'profile.language': 'Langue',
                'profile.edit_language': 'Modifier la langue',
                'profile.continent': 'Continent',
                'profile.edit_continent': 'Modifier le continent',
                'profile.continent_europe': 'Europe',
                'profile.continent_north_america': 'Amérique du Nord',
                'profile.continent_south_america': 'Amérique du Sud',
                'profile.continent_africa': 'Afrique',
                'profile.continent_asia': 'Asie',
                'profile.continent_oceania': 'Océanie',
                'profile.continent_antarctica': 'Antarctique',
                'profile.country': 'Pays',
                'profile.edit_country': 'Modifier le pays',
                'profile.country_modified_success': 'Pays modifié avec succès !',
                'profile.join_date': 'Date d\'inscription',
                'profile.blocked_users': 'Utilisateurs bloqués',
                'profile.no_blocked_users': 'Aucun utilisateur bloqué',
                'profile.unblock': 'Débloquer',
                'profile.unblock_user': 'Débloquer cet utilisateur',
                'profile.account_actions': 'Actions du compte',
                'profile.logout': 'Déconnexion',
                'profile.tier_list_create': 'Créez vos premières tier lists pour classer vos animes et mangas préférés !',
                'profile.no_followers': 'Aucun abonné pour le moment.',
                'profile.no_following': 'Aucun abonnement pour le moment.',
                'profile.settings.no_password': 'Aucun mot de passe requis',
                'profile.order_desc': 'Ordre décroissant',
                'profile.order_asc': 'Ordre croissant',
                'profile.type_all': 'Tous types',
                'profile.followers_modal_title': 'Abonnés',
                'profile.following_modal_title': 'Abonnements',
                'profile.follows_hidden_followers': 'Cet utilisateur a choisi de masquer ses abonnés.',
                'profile.follows_hidden_following': 'Cet utilisateur a choisi de masquer ses abonnements.',
                'profile.unblock_confirm': 'Voulez-vous vraiment débloquer',
                'profile.unblock_confirm_end': '? Vous pourrez à nouveau voir son profil et ses contenus.',
                'profile.privacy_subscriptions_hint': 'Les autres utilisateurs ne pourront pas voir vos abonnés et abonnements',
                'profile.pseudo_edit_hint_30days': 'Vous pouvez modifier votre pseudo (une fois tous les 30 jours)',
                'profile.pseudo_cooldown_days': 'Vous pourrez modifier votre pseudo dans {{n}} jour(s)',
                'profile.username_tooltip': 'Vous pouvez modifier votre nom d\'utilisateur une fois tous les 30 jours. Minimum 3 caractères, maximum 20, uniquement lettres, chiffres, tirets et underscores, pseudo unique.',
                'profile.password_label': 'Mot de passe',
                'profile.show_password': 'Afficher le mot de passe',
                'profile.hide_password': 'Masquer le mot de passe',
                'profile.logout_confirm_title': 'Confirmer la déconnexion',
                'profile.logout_confirm_message': 'Êtes-vous sûr de vouloir vous déconnecter ?',
                'profile.logout_confirm_sub': 'Vous devrez vous reconnecter pour accéder à votre compte.',
                'profile.continent_modified_success': 'Continent modifié avec succès !',
                'profile.country_modified_success': 'Pays modifié avec succès !',
                'profile.success': 'Succès',
                
                // Authentification et inscription
                'auth.thank_you_title': 'Merci de nous rejoindre !',
                'auth.thank_you_description': 'Votre inscription nous permet de vous offrir une expérience personnalisée et de vous tenir informé des dernières nouveautés manga.',
                'auth.suggestions_personalized': 'Suggestions personnalisées',
                'auth.tier_lists': 'Tier lists',
                'auth.community': 'Communauté',
                'auth.data_protection': 'Vos données sont protégées et ne seront jamais partagées avec des tiers.',
                
                // Messages de validation du pseudo
                'auth.pseudo_min_length': 'Le pseudo doit contenir au moins 3 caractères',
                'auth.pseudo_max_length': 'Le pseudo ne peut pas dépasser 20 caractères',
                'auth.pseudo_invalid_chars': 'Le pseudo ne peut contenir que des lettres, chiffres, tirets et underscores',
                'auth.pseudo_forbidden_words': 'Ce pseudo contient des mots interdits',
                'auth.pseudo_variations_forbidden': 'Ce pseudo contient des variations de mots interdits',
                'auth.pseudo_attached_chars_forbidden': 'Ce pseudo contient des caractères attachés interdits',
                'auth.pseudo_already_taken': 'Ce pseudo est déjà pris',
                'auth.pseudo_available': 'Pseudo disponible !',
                
                // Messages d'authentification
                'auth.login': 'Se connecter',
                'auth.register': 'S\'inscrire',
                'auth.username': 'Pseudo',
                'auth.email': 'Adresse email',
                'auth.password': 'Mot de passe',
                'auth.language': 'Langue',
                'auth.continent': 'Continent',
                'auth.country': 'Pays',
                'auth.choose_country': 'Choisissez votre pays',
                'auth.age_confirmation': 'Je confirme avoir plus de 18 ans',
                'auth.stay_connected': 'Rester connecté',
                'auth.accept_terms': 'J\'accepte les',
                'auth.terms_of_service': 'conditions d\'utilisation',
                'auth.privacy_policy': 'politique de confidentialité',
                'auth.create_account': 'Créer mon compte',
                
                // Navigation
                'nav.login': 'Se connecter',
                'nav.register': 'S\'inscrire',
                
                // Auteurs et leurs descriptions
                'author.naoki_urasawa': 'Naoki Urasawa (né en 1960 à Tokyo) est un mangaka, scénariste et musicien japonais, considéré comme l\'un des plus grands auteurs contemporains. Il est célèbre pour ses thrillers psychologiques, ses intrigues complexes et ses personnages profonds. Urasawa a débuté sa carrière en 1983 et s\'est imposé avec des œuvres majeures comme Monster, 20th Century Boys et Pluto.',
                'author.rumiko_takahashi': 'Rumiko Takahashi est l\'une des mangakas les plus populaires au monde, connue pour ses comédies romantiques et fantastiques. Elle est l\'auteure de Ranma ½, Maison Ikkoku, InuYasha et Urusei Yatsura.',
                'author.akira_toriyama': 'Akira Toriyama est le créateur de Dragon Ball, l\'un des mangas les plus influents de l\'histoire, et de Dr. Slump. Son style dynamique et son humour ont marqué des générations de lecteurs.',
                'author.clamp': 'CLAMP est un collectif féminin d\'auteures connu pour ses univers fantastiques, ses personnages attachants et ses crossovers. On leur doit Card Captor Sakura, xxxHolic, Tsubasa Reservoir Chronicle…',
                'author.takehiko_inoue': 'Takehiko Inoue est célèbre pour ses mangas sportifs et historiques, notamment Slam Dunk, Vagabond et Real. Son dessin réaliste et son sens du mouvement sont salués dans le monde entier.',
                'author.hiromu_arakawa': 'Hiromu Arakawa, née en 1973 à Hokkaidō, est une mangaka japonaise mondialement connue pour Fullmetal Alchemist. Issue d\'une famille d\'agriculteurs, elle a su imposer un style réaliste, dynamique et plein d\'humour.',
                'author.masashi_kishimoto': 'Masashi Kishimoto, né en 1974 dans la préfecture d\'Okayama, est le créateur de Naruto, l\'un des mangas les plus populaires de tous les temps. Passionné de dessin depuis l\'enfance, il s\'inspire d\'Akira Toriyama et de la culture japonaise pour créer un univers riche en ninjas.',
                'author.yoshihiro_togashi': 'Yoshihiro Togashi, né en 1966 à Shinjō, est un mangaka japonais célèbre pour Yu Yu Hakusho et Hunter x Hunter. Il est reconnu pour ses intrigues complexes, ses personnages nuancés et sa capacité à surprendre le lecteur.',
                'author.hajime_isayama': 'Hajime Isayama, né en 1986 dans la préfecture d\'Oita, est l\'auteur de L\'Attaque des Titans (Shingeki no Kyojin), un phénomène mondial. Son manga, débuté en 2009, a captivé des millions de lecteurs par son univers sombre et ses rebondissements.',
                'author.osamu_tezuka': 'Osamu Tezuka (1928-1989) est considéré comme le « dieu du manga ». Médecin de formation, il révolutionne la bande dessinée japonaise dès les années 1940 avec un style cinématographique, des personnages expressifs et des récits profonds.',
                
                // Œuvres des auteurs
                'work.monster': 'Un thriller haletant sur la traque d\'un tueur en série en Allemagne.',
                'work.20th_century_boys': 'Un récit de science-fiction et de complot, entre enfance et apocalypse.',
                'work.pluto': 'Une relecture mature d\'Astro Boy, mêlant enquête et réflexion sur l\'humanité.',
                'work.ranma': 'Une comédie d\'arts martiaux et de quiproquos autour d\'un garçon qui se transforme en fille.',
                'work.inuyasha': 'Un shōnen fantastique mêlant romance, action et folklore japonais.',
                'work.urusei_yatsura': 'Une série culte de science-fiction et d\'humour déjanté.',
                'work.dragon_ball': 'L\'aventure épique de Son Goku à la recherche des Dragon Balls.',
                'work.dr_slump': 'Une comédie absurde dans le village du Pingouin avec la petite robot Arale.',
                'work.sand_land': 'Un one-shot d\'aventure dans un monde désertique.',
                'work.card_captor_sakura': 'L\'histoire magique de Sakura, chasseuse de cartes.',
                'work.xxxholic': 'Un manga surnaturel et mystérieux, croisé avec Tsubasa.',
                'work.tsubasa': 'Une aventure à travers les mondes parallèles de CLAMP.',
                'work.slam_dunk': 'Le manga de basket qui a révolutionné le genre.',
                'work.vagabond': 'Une fresque historique sur le samouraï Miyamoto Musashi.',
                'work.real': 'Un manga sur le handisport et la résilience.',
                'work.fullmetal_alchemist': 'Un shōnen culte mêlant alchimie, aventure et réflexion sur l\'humanité.',
                'work.silver_spoon': 'Une plongée réaliste et drôle dans le monde agricole japonais.',
                'work.arslan': 'Une fresque épique adaptée d\'un roman de fantasy historique.',
                'work.naruto': 'L\'histoire d\'un jeune ninja rejeté qui rêve de devenir Hokage.',
                'work.boruto': 'La suite de Naruto, centrée sur la nouvelle génération de ninjas.',
                'work.samurai_8': 'Un manga de science-fiction mêlant samouraïs et univers futuriste.',
                'work.hunter_x_hunter': 'L\'aventure de Gon à la recherche de son père dans un monde de chasseurs.',
                'work.yu_yu_hakusho': 'Un shōnen surnaturel où un adolescent devient détective des esprits.',
                'work.level_e': 'Une comédie de science-fiction décalée et imprévisible.',
                'work.attack_on_titan': 'L\'humanité lutte pour sa survie face aux titans dévoreurs d\'hommes.',
                'work.heart_break_one': 'Un one-shot de jeunesse, témoignage des débuts d\'Isayama.',
                'work.orz': 'Un autre récit court, publié avant le succès des Titans.',
                'work.astro_boy': 'Le robot le plus célèbre du manga, symbole d\'humanisme et d\'aventure.',
                'work.black_jack': 'Un chirurgien de génie, héros de récits médicaux et moraux.',
                'work.phoenix': 'Une fresque philosophique sur la vie, la mort et la réincarnation.',
                
                // Questions du quiz (quelques exemples)
                'quiz.hunter_nen_creator': 'Dans Hunter x Hunter, quel est le nom du créateur du Nen ?',
                'quiz.hunter_nen_choices': ['Isaac Netero', 'Don Freecss', 'Zigg Zoldyck', 'Maha Zoldyck'],
                'quiz.onepiece_blackbeard': 'Dans One Piece, quel est le vrai nom de Barbe Noire ?',
                'quiz.onepiece_blackbeard_choices': ['Edward Newgate', 'Portgas D. Ace', 'Marshall D. Teach', 'Rocks D. Xebec'],
                'quiz.deathnote_l_real_name': 'Dans Death Note, quel est le vrai nom de L ?',
                'quiz.deathnote_l_choices': ['Hideki Ryuga', 'Nate River', 'Mello', 'L Lawliet'],
                'quiz.fullmetal_father': 'Dans Fullmetal Alchemist, quel est le nom du père d\'Edward et Alphonse ?',
                'quiz.fullmetal_father_choices': ['King Bradley', 'Van Hohenheim', 'Scar', 'Maes Hughes'],
                'quiz.naruto_byakugan_clan': 'Dans Naruto, quel est le nom du clan possédant le Byakugan ?',
                'quiz.naruto_byakugan_choices': ['Senju', 'Aburame', 'Hyuga', 'Uchiha'],
                'quiz.myhero_allmight': 'Dans My Hero Academia, quel est le vrai nom d\'All Might ?',
                'quiz.myhero_allmight_choices': ['Shota Aizawa', 'Toshinori Yagi', 'Enji Todoroki', 'Tenya Iida'],
                'quiz.attack_titan_original': 'Dans l\'Attaque des Titans, qui est le premier détenteur du Titan Originel ?',
                'quiz.attack_titan_original_choices': ['Eren Jaeger', 'Ymir Fritz', 'Grisha Jaeger', 'Frieda Reiss'],
                'quiz.jojo_jotaro_stand': 'Dans JoJo\'s Bizarre Adventure, quel est le Stand de Jotaro Kujo ?',
                'quiz.jojo_jotaro_stand_choices': ['The World', 'Crazy Diamond', 'Star Platinum', 'Killer Queen'],
                'quiz.demonslayer_giyu_breath': 'Dans Demon Slayer, quel est le souffle utilisé par Giyu Tomioka ?',
                'quiz.demonslayer_giyu_breath_choices': ['Souffle de la Flamme', 'Souffle de la Lune', 'Souffle de l\'Eau', 'Souffle de la Foudre'],
                
                // Éléments de la page collection
                'collection.change_status': 'Changer statut',
                'collection.remove_from_list': 'Retirer de la liste',
                'collection.status_modal.title': 'Changer le statut',
                'collection.status_modal.add_title': 'Ajouter à ma liste',
                'collection.status.watching': 'En cours',
                'collection.status.completed': 'Terminé',
                'collection.status.on_hold': 'En pause',
                'collection.status.dropped': 'Abandonné',
                'collection.status.plan_to_watch': 'À voir',
                'collection.status.watching_desc': 'Vous regardez actuellement',
                'collection.status.completed_desc': 'Vous avez terminé',
                'collection.status.on_hold_desc': 'Vous avez mis en pause',
                'collection.status.dropped_desc': 'Vous avez abandonné',
                'collection.status.plan_to_watch_desc': 'Vous voulez regarder',
                'collection.stopped_at.label': 'Où vous êtes-vous arrêté ?',
                'collection.stopped_at.episode': 'épisode',
                'collection.stopped_at.chapter': 'chapitre',
                'collection.stopped_at.volume': 'volume',
                'collection.stopped_at.hint': 'Indiquez le numéro d\'épisode ou de volume où vous vous êtes arrêté',
                'collection.confirm_status': 'Confirmer',
                'collection.empty.title': 'Votre liste est vide',
                'collection.empty.subtitle': 'Commencez à ajouter des mangas et animes à votre liste !',
                'collection.empty.cta': 'Découvrir des mangas',
                'collection.delete.confirm_title': 'Confirmer la suppression',
                'collection.delete.confirm_message': 'Êtes-vous sûr de vouloir retirer cet item de votre liste ? Cette action ne peut pas être annulée.',
                'collection.delete.cancel': 'Annuler',
                'collection.delete.confirm': 'Supprimer',
                'collection.pagination.display': 'Affichage de {start}-{end} sur {total} items',
                'collection.pagination.previous': 'Précédent',
                'collection.pagination.next': 'Suivant',
                
                // Signalement de profil
                'profile.report': 'Signaler',
                'profile.report.title': 'Signaler cet utilisateur',
                'profile.report.subtitle': 'Pourquoi signalez-vous cet utilisateur ?',
                'profile.report.reason.harassment': 'Harcèlement ou comportement toxique',
                'profile.report.reason.spam': 'Spam ou publicité non sollicitée',
                'profile.report.reason.inappropriate': 'Contenu offensant ou inapproprié',
                'profile.report.reason.fake': 'Compte impersonnant quelqu\'un d\'autre',
                'profile.report.reason.other': 'Autre raison',
                'profile.report.comment.label': 'Détails (optionnel)',
                'profile.report.submit': 'Signaler',
                'profile.report.block': 'Bloquer',
                
                // Paramètres de profil
                'profile.settings.google_auth': 'Authentification Google',
                'profile.settings.no_password': 'Aucun mot de passe requis',
                
                                        // Filtres de note
                        'all_ratings': 'Toutes notes',
                        'min_score_7': 'Note minimale 7',
                        'min_score_8': 'Note minimale 8',
                        'min_score_9': 'Note minimale 9',
                        'min_score_10': 'Note minimale 10',
                        
                        // Pages de détail (sans préfixes)
                        'title': 'Détails',
                        'back_to_catalogue': 'Retour au catalogue',
                        'loading': 'Chargement...',
                        'no_manga_selected': 'Aucun manga sélectionné. Veuillez retourner au catalogue.',
                        'no_anime_selected': 'Aucun anime sélectionné. Veuillez retourner au catalogue.',
                        'load_error': 'Une erreur est survenue lors du chargement des détails.',
                        'no_genre': 'Aucun genre spécifié',
                        'no_theme': 'Aucun thème spécifié',
                        'no_characters': 'Aucun personnage trouvé.',
                        'type': 'Type',
                        'your_rating': 'Votre note :',
                        'cancel': 'Annuler',
                        'click_to_rate': 'Cliquez sur les étoiles pour noter',
                        'potential_rating': 'Note potentielle :',
                        'synopsis': 'Synopsis',
                        'genres': 'Genres',
                        'general_info': 'Informations générales',
                        'original_title': 'Titre original :',
                        'english_title': 'Titre anglais :',
                        'authors': 'Auteur(s) :',
                        'chapters': 'Chapitres :',
                        'volumes': 'Volumes :',
                        'year': 'Année :',
                        'publication_date': 'Date de publication :',
                        'popularity': 'Popularité',
                        'rank': 'Rang',
                        'members': 'Membres',
                        'favorites': 'Favoris',
                        'episodes': 'Épisodes',
                        'duration': 'Durée',
                        'season': 'Saison',
                        'start_date': 'Date de début',
                        'end_date': 'Date de fin :',
                        'broadcast': 'Broadcast :',
                        'source': 'Source :',
                        'studios': 'Studios :',
                        'votes': 'Votes :',
                        'min_score_10': 'Note minimale 10',
                        
                        // Titres alternatifs (sans préfixe)
                        'alternative_titles': 'Titres alternatifs',
                        'japanese_title': 'Titre japonais :',
                        'french_title': 'Titre français :'
            },
            en: {
                // Navigation essentielle
                'nav.home': 'Home',
                'nav.manga_anime': 'Manga & Anime',
                'nav.collection': 'Collection',
                'nav.profile': 'Profile',
                'nav.tierlist': 'Tier List',
                'nav.forum': 'Forum',
                
                // Titres de pages essentiels
                'catalogue.title.manga': 'Manga',
                'catalogue.title.anime': 'Anime',
                'collection.title': 'My Collection',
                'collection.subtitle': 'Manage your favorite manga and anime',
                
                // Filtres essentiels
                'type': 'Type',
                'status': 'Status',
                'sort': 'Sort by',
                'reset': 'Reset',
                
                // Options de filtre essentielles
                'manga': 'Manga',
                'anime': 'Anime',
                'novel': 'Novel',
                'doujin': 'Doujin',
                'manhwa': 'Manhwa',
                'manhua': 'Manhua',
                'all_status': 'All status',
                'watching': 'Watching',
                'completed': 'Completed',
                'on_hold': 'On Hold',
                'dropped': 'Dropped',
                'plan_to_watch': 'Plan to Watch',
                'score': 'Best Score',
                'popularity': 'Most Popular',
                'genre_sort': 'Sort by genre',
                'no_synopsis_available': 'No synopsis available',
                
                // Types d'anime
                'anime_type': 'Anime Type',
                'all_anime_types': 'All Anime Types',
                'tv': 'TV',
                'movie': 'Movie',
                'ova': 'OVA',
                'special': 'Special',
                'ona': 'ONA',
                'music': 'Music',
                
                // Statuts
                'watching': 'Watching',
                'completed': 'Completed',
                'on_hold': 'On Hold',
                'dropped': 'Dropped',
                'plan_to_watch': 'Plan to Watch',
                
                // Tri
                'score': 'Best Score',
                'popularity': 'Most Popular',
                'genre_sort': 'Sort by genre',
                'no_synopsis_available': 'No synopsis available',
                
                // Types d'anime
                'anime_type': 'Anime-Typ',
                'all_anime_types': 'Alle Anime-Typen',
                'tv': 'TV',
                'movie': 'Film',
                'ova': 'OVA',
                'special': 'Special',
                'ona': 'ONA',
                'music': 'Musik',
                
                // Statuts
                'watching': 'Schauen',
                'completed': 'Abgeschlossen',
                'on_hold': 'Pausiert',
                'dropped': 'Abgebrochen',
                'plan_to_watch': 'Plan zu schauen',
                
                // Tri
                'score': 'Beste Bewertung',
                'popularity': 'Beliebteste',
                'genre_sort': 'Nach Genre sortieren',
                'no_synopsis_available': 'Keine Beschreibung verfügbar',
                
                // Types d'anime
                'anime_type': 'Tipo de Anime',
                'all_anime_types': 'Todos los Tipos de Anime',
                'tv': 'TV',
                'movie': 'Película',
                'ova': 'OVA',
                'special': 'Especial',
                'ona': 'ONA',
                'music': 'Música',
                
                // Statuts
                'watching': 'Viendo',
                'completed': 'Completado',
                'on_hold': 'En Pausa',
                'dropped': 'Abandonado',
                'plan_to_watch': 'Plan para Ver',
                
                // Tri
                'score': 'Mejor Puntuación',
                'popularity': 'Más Populares',
                'genre_sort': 'Ordenar por género',
                'no_synopsis_available': 'Sinopsis no disponible',
                
                // Types d'anime
                'anime_type': 'Tipo di Anime',
                'all_anime_types': 'Tutti i Tipi di Anime',
                'tv': 'TV',
                'movie': 'Film',
                'ova': 'OVA',
                'special': 'Speciale',
                'ona': 'ONA',
                'music': 'Musica',
                
                // Statuts
                'watching': 'Guardando',
                'completed': 'Completato',
                'on_hold': 'In Pausa',
                'dropped': 'Abbandonato',
                'plan_to_watch': 'Pianificato',
                
                // Tri
                'score': 'Miglior Punteggio',
                'popularity': 'Più Popolari',
                'genre_sort': 'Ordina per genere',
                'no_synopsis_available': 'Nessuna sinossi disponibile',
                
                // Types d'anime
                'anime_type': 'アニメタイプ',
                'all_anime_types': 'すべてのアニメタイプ',
                'tv': 'TV',
                'movie': '映画',
                'ova': 'OVA',
                'special': 'スペシャル',
                'ona': 'ONA',
                'music': '音楽',
                
                // Statuts
                'watching': '視聴中',
                'completed': '完了',
                'on_hold': '一時停止',
                'dropped': '視聴中止',
                'plan_to_watch': '視聴予定',
                
                // Tri
                'score': '最高評価',
                'popularity': '人気順',
                'genre_sort': 'ジャンルで並べ替え',
                'no_synopsis_available': 'あらすじなし',
                
                // Autres options
                'rating': 'Minimum Rating',
                'relevance': 'Relevance',
                'title': 'Alphabetical Order',
                'start_date': 'Release Date',
                
                // Pagination
                'pagination.previous': 'Previous',
                'pagination.next': 'Next',
                
                // Modal de statut
                'collection.status_modal.title': 'Choose a status',
                'collection.status.watching': 'Watching',
                'collection.status.completed': 'Completed',
                'collection.status.on_hold': 'On Hold',
                'collection.status.dropped': 'Dropped',
                'collection.status.plan_to_watch': 'Plan to Watch',
                
                // Messages essentiels
                'message.loading': 'Loading...',
                'message.error': 'An error occurred',
                'message.no_results': 'No results found',
                
                // Barre de recherche
                'search.placeholder': 'Search for an anime or manga...',
                
                // Collection essentielle
                'collection.filter.all': 'All',
                'collection.filter.watching': 'Watching',
                'collection.filter.completed': 'Completed',
                'collection.filter.on_hold': 'On Hold',
                'collection.filter.dropped': 'Dropped',
                'collection.filter.plan_to_watch': 'Plan to Watch',
                'user_profile.tab_anime_manga': 'Anime & Manga',
                'user_profile.tab_collection': 'Collection',
                'user_profile.empty_title': 'No items in this collection',
                'user_profile.empty_text': 'Start adding anime and manga to your collection!',
                'user_profile.user_not_found': 'User not found',
                'user_profile.user_not_found_desc': 'The user you are looking for does not exist.',
                'user_profile.back_home': 'Back to home',
                'user_profile.no_cards': 'No cards to display.',
                'collection.type.all': 'All Types',
                'collection.type.anime': 'Anime',
                'collection.type.manga': 'Manga',
                'collection.type.novel': 'Novel',
                'collection.type.roman': 'Novel',
                'collection.type.doujin': 'Doujin',
                'collection.type.manhwa': 'Manhwa',
                'collection.type.manhua': 'Manhua',
                'collection.type.film': 'Film',
                'collection.label_episodes': 'episodes',
                'collection.label_volumes': 'volumes',
                'collection.stats.watching': 'Watching',
                'collection.stats.completed': 'Completed',
                'collection.stats.on_hold': 'On Hold',
                'collection.stats.dropped': 'Dropped',
                'collection.stats.plan_to_watch': 'Plan to Watch',
                
                // Éléments de la page collection
                'collection.change_status': 'Change Status',
                'collection.remove_from_list': 'Remove from List',
                'collection.status_modal.title': 'Change Status',
                'collection.status_modal.add_title': 'Add to My List',
                'collection.status.watching': 'Watching',
                'collection.status.completed': 'Completed',
                'collection.status.on_hold': 'On Hold',
                'collection.status.dropped': 'Dropped',
                'collection.status.plan_to_watch': 'Plan to Watch',
                'collection.status.watching_desc': 'You are currently watching',
                'collection.status.completed_desc': 'You have completed',
                'collection.status.on_hold_desc': 'You have put on hold',
                'collection.status.dropped_desc': 'You have dropped',
                'collection.status.plan_to_watch_desc': 'You want to watch',
                'collection.stopped_at.label': 'Where did you stop?',
                'collection.stopped_at.episode': 'episode',
                'collection.stopped_at.chapter': 'chapter',
                'collection.stopped_at.volume': 'volume',
                'collection.stopped_at.hint': 'Enter the episode or volume number where you stopped',
                'collection.confirm_status': 'Confirm',
                'collection.empty.title': 'Your list is empty',
                'collection.empty.subtitle': 'Start adding manga and anime to your list!',
                'collection.empty.cta': 'Discover manga',
                'collection.delete.confirm_title': 'Confirm Deletion',
                'collection.delete.confirm_message': 'Are you sure you want to remove this item from your list? This action cannot be undone.',
                'collection.delete.cancel': 'Cancel',
                'collection.delete.confirm': 'Delete',
                'collection.pagination.display': 'Displaying {start}-{end} of {total} items',
                'collection.pagination.previous': 'Previous',
                'collection.pagination.next': 'Next',
                
                // Profile reporting
                'profile.report': 'Report',
                'profile.report.title': 'Report this user',
                'profile.report.subtitle': 'Why are you reporting this user?',
                'profile.report.reason.harassment': 'Harassment or toxic behavior',
                'profile.report.reason.spam': 'Spam or unsolicited advertising',
                'profile.report.reason.inappropriate': 'Offensive or inappropriate content',
                'profile.report.reason.fake': 'Account impersonating someone else',
                'profile.report.reason.other': 'Other reason',
                'profile.report.comment.label': 'Details (optional)',
                'profile.report.submit': 'Report',
                'profile.report.block': 'Block',
                
                // Paramètres de profil
                'profile.settings.google_auth': 'Google Authentication',
                'profile.settings.no_password': 'No password required',
                
                // Filtres de note
                'all_ratings': 'All Ratings',
                'min_score_7': 'Min Score 7',
                'min_score_8': 'Min Score 8',
                'min_score_9': 'Min Score 9',
                'min_score_10': 'Min Score 10',
                
                // Pages de détail (sans préfixes)
                'title': 'Details',
                'back_to_catalogue': 'Back to catalogue',
                'loading': 'Loading...',
                'no_manga_selected': 'No manga selected. Please return to the catalogue.',
                'no_anime_selected': 'No anime selected. Please return to the catalogue.',
                'load_error': 'An error occurred while loading details.',
                'no_genre': 'No genre specified',
                'no_theme': 'No theme specified',
                'no_characters': 'No characters found.',
                'type': 'Type',
                'your_rating': 'Your rating:',
                'cancel': 'Cancel',
                'click_to_rate': 'Click on the stars to rate',
                'potential_rating': 'Potential rating:',
                'synopsis': 'Synopsis',
                'genres': 'Genres',
                'general_info': 'General Information',
                'original_title': 'Original title:',
                'english_title': 'English title:',
                'authors': 'Author(s):',
                'chapters': 'Chapters:',
                'volumes': 'Volumes:',
                'year': 'Year:',
                'publication_date': 'Publication date:',
                'popularity': 'Popularity',
                'rank': 'Rank',
                'members': 'Members',
                'favorites': 'Favorites',
                'episodes': 'Episodes',
                'duration': 'Duration',
                'season': 'Season',
                'start_date': 'Start date',
                'end_date': 'End date:',
                'broadcast': 'Broadcast:',
                'source': 'Source:',
                'studios': 'Studios:',
                'votes': 'Votes:',
                'min_score_9': 'Min Score 9',
                'min_score_10': 'Min Score 10',
                
                // Titres alternatifs (sans préfixe)
                'alternative_titles': 'Alternative Titles',
                'japanese_title': 'Japanese title:',
                'french_title': 'French title:',
                
                // Page d'accueil
                'home.hero_subtitle': 'Your ultimate destination to track and rate your favorite anime and manga',
                'home.explore': 'Explore the collection',
                'home.why_choose': 'Why choose MangaWatch?',
                'home.feature_catalogue_title': 'Complete Catalog',
                'home.feature_catalogue_desc': 'Access a vast collection of anime and manga, from timeless classics to the latest releases.',
                'home.feature_rating_title': 'Smart Rating',
                'home.feature_rating_desc': 'Rate and evaluate your favorite works to help the community discover gems.',
                'home.feature_tierlist_title': 'Custom Tier Lists',
                'home.feature_tierlist_desc': 'Create and share your own anime and character rankings.',
                
                // Auteur du jour
                'home.author_of_week': 'Author of the week',
                'home.author_bio': 'Biography',
                'home.author_works': 'Main works',
                'home.author_follow': 'Follow',
                'home.author_unfollow': 'Unfollow',
                'home.author_featured': 'Featured:',
                'home.author_major_works': 'Major works',
                
                // Vote du jour
                'home.vote_title': 'Vote for the anime you think is the best today!',
                'home.vote_title_manga': 'Vote for the manga you think is the best today!',
                'home.vote_type_anime': 'Vote of the day: Anime',
                'home.vote_type_manga': 'Vote of the day: Manga',
                'home.vote_button': 'Vote',
                'home.vote_voted': '✓ Voted',
                'home.vote_already_voted': 'Already voted',
                'home.vote_votes': 'vote',
                'home.vote_votes_plural': 'votes',
                'home.vote_already_voted_message': 'You have already voted today! Come back tomorrow to vote again.',
                
                // Section Vote du Jour
                'home.vote_of_day': 'Vote of the Day',
                'home.vote_description': 'Which anime/manga do you prefer today?',
                'home.vote_results': 'Vote Results',
                'home.vote_new_vote': 'New Vote',
                'home.vote_already_voted_today': 'You have already voted today!',
                'home.vote_reset_tomorrow': 'You can reset the vote tomorrow!',
                
                // Nouveaux membres
                'home.new_members': 'New members',
                
                // Quiz du jour
                'home.quiz_title': 'Quiz of the day',
                'home.quiz_validate': 'Validate my answer',
                'home.quiz_correct': 'Correct!',
                'home.quiz_incorrect': 'Incorrect!',
                'home.quiz_correct_answer': 'The correct answer was:',
                'home.quiz_continue': 'Continue',
                'home.quiz_select_answer': 'Please select an answer!',
                'home.quiz_question_progress': 'Question {current} of {total} • New question tomorrow!',
                'home.quiz_error': 'Unable to load the quiz at the moment.',
                
                // Nouveaux utilisateurs
                'home.new_users': 'New users',
                'home.new_users_error': 'Unable to load new users at the moment.',
                'home.new_users_error_retry': 'Please try again later.',
                'home.new_users_stat_animes': 'Animes',
                'home.new_users_stat_mangas': 'Mangas',
                'home.new_users_stat_tierlists': 'Tier Lists',
                'home.new_users_join_days_ago': '{days} days ago',
                'home.new_users_join_week_ago': '1 week ago',
                'home.new_users_join_weeks_ago': '{weeks} weeks ago',
                
                // Popup d'authentification
                'home.welcome_title': 'Welcome to MangaWatch!',
                'home.welcome_login': 'Log in',
                'home.welcome_register': 'Sign up',
                
                // Recherche
                'search.placeholder.manga': 'Search for a manga...',
                'search.placeholder.anime': 'Search for an anime...',
                'search.placeholder.movie': 'Search for a movie...',
                'search.placeholder.manhwa': 'Search for a manhwa...',
                'search.placeholder.manhua': 'Search for a manhua...',
                'search.placeholder.user': 'Search for a user...',
                'search.placeholder.generic': 'Search...',
                'search.aria_label': 'Search',
                'search.clear_aria': 'Clear search',
                
                // Options de recherche
                'search.type.manga': 'Manga',
                'search.type.anime': 'Anime',
                'search.type.movie': 'Movie',
                'search.type.manhwa': 'Manhwa',
                'search.type.manhua': 'Manhua',
                'search.type.user': 'User',
                'search.results_for': 'Search results for "{query}" ({count})',
                'search.results_for_genre': 'Search results for genre "{genre}" for "{query}" ({count})',
                'search.no_results_genre': 'No results found for genre "{genre}" for "{query}"',
                'search.no_results': 'No results found for "{query}"',
                'search.result_one': '1 result',
                'search.result_many': '{n} results',
                'common.pagination_prev': '← Previous',
                'common.pagination_next': 'Next →',
                'genre.of_genre': 'of genre:',
                'genre.type_label': 'Type:',
                'genre.content_mangas': 'Manga',
                'genre.content_animes': 'Anime',
                'genre.content_films': 'Films',
                'genre.content_contents': 'Contents',
                'genre.content_manhwa': 'Manhwa',
                'genre.content_manhua': 'Manhua',
                'genre.content_all': 'All',
                'profile.rating_label': 'Rating',
                'profile.not_rated': 'Not rated',
                'common.scroll_bottom': '↓ Down',
                'common.scroll_top': '↑ Top',
                'common.scroll_bottom_title': 'Scroll to bottom of page',
                'common.scroll_top_title': 'Scroll to top of page',
                
                // Messages généraux
                'common.loading': 'Loading...',
                'common.loading_vote_options': 'Loading vote options...',
                'common.message': 'Message',
                'common.message_content': 'Message content',
                'common.understood': 'Got it',
                'common.avatar_user': 'User avatar',
                'common.description_unavailable': 'Description unavailable.',
                'common.image_unavailable': 'Image unavailable',
                'common.avatar_unavailable': 'Avatar unavailable',
                'common.image_not_loaded': 'Image not loaded',
                'common.poster_of': 'Poster of',
                'common.avatar_of': 'Avatar of',
                
                // Vote du jour (détails)
                'home.vote_description_template': 'Which {type} do you prefer today?',
                'home.vote_type_badge_anime': 'Vote of the day: Anime',
                'home.vote_type_badge_manga': 'Vote of the day: Manga',
                'home.vote_button_text': 'Vote',
                'home.vote_count': 'votes',
                'home.vote_already_done_title': 'Vote already done',
                'home.vote_already_done_message': 'You have already voted today! You can vote again tomorrow.',
                'home.logout_title': '👋 Logout',
                'home.logout_message': 'You have been successfully logged out',
                'home.vote_new_votes_notification': 'new vote(s)!',
                
                // Footer
                'footer.copyright': '©',
                'footer.all_rights_reserved': 'All rights reserved',
                'footer.made_by': 'Made by',
                
                // Help / Tickets
                'help.title': 'Help - Report a problem',
                'help.ticket_title': 'Help - Report a problem',
                'help.ticket_subject': 'Subject',
                'help.ticket_message': 'Describe your problem',
                'help.ticket_send': 'Send ticket',
                'help.ticket_cancel': 'Cancel',
                'help.close': 'Close',
                'help.ticket_success': 'Your ticket has been sent. We will reply if needed.',
                'help.ticket_error': 'An error occurred. Contact us at mangawatch.off@gmail.com',
                'help.ticket_login': 'Log in to send a ticket, or email us at mangawatch.off@gmail.com',
                'help.my_tickets': 'My tickets',
                'help.new_ticket': 'New ticket',
                'help.placeholder_subject': 'E.g. Login issue, bug on collection page...',
                'help.placeholder_message': 'Describe the problem in detail...',
                'help.loading': 'Loading…',
                'help.loading_tickets': 'Loading your tickets…',
                'help.login_to_see': 'Log in to view and manage your tickets.',
                'help.service_unavailable': 'Service unavailable.',
                'help.no_tickets': 'You have no tickets. Create one with the "New ticket" tab.',
                'help.closed': 'Closed',
                'help.in_progress': 'In progress',
                'help.no_subject': 'No subject',
                'help.back_to_list': 'Back to list',
                'help.your_message': 'Your message',
                'help.support': 'Support',
                'help.you': 'You',
                'help.your_reply': 'Your reply',
                'help.send_reply': 'Send',
                'help.close_ticket_btn': 'Close ticket',
                'help.conversation_closed': 'Conversation closed',
                'help.conversation_closed_desc': 'This ticket can no longer receive replies. You can only view the history above.',
                'help.close_ticket_confirm_title': 'Close this ticket?',
                'help.close_ticket_confirm_desc': 'Once closed, you will not be able to reply. The conversation will remain visible read-only.',
                'help.close_ticket_confirm_btn': 'Close ticket',
                'help.ticket_closed_toast': 'Ticket closed. The conversation remains visible read-only.',
                'help.reply_sent': 'Reply sent.',
                'help.reply_to_your_ticket': 'Reply to your ticket',
                'help.reply_error': 'Error sending.',
                'help.close_error': 'Error closing.',
                'help.load_error': 'Unable to load your tickets. Please try again later.',
                'help.load_error_index': 'Configuration required: deploy Firestore indexes then try again.',
                'help.load_error_permission': 'Access denied. Make sure you are logged in with the account linked to your tickets.',
                'help.tickets_not_enabled_confirm': 'Tickets are not yet enabled on the server. Do you want to open your email client to contact us?',
                'messaging.title': 'Messages',
                'messaging.aria_label': 'Messages',
                'messaging.loading': 'Loading messages...',
                'messaging.empty': 'No messages at the moment',
                'messaging.back': 'Back',
                'messaging.mark_all_read': 'Mark all as read',
                'messaging.load_error': 'Error loading messages',
                'messaging.delete_error': 'Error deleting message.',
                'messaging.delete': 'Delete',
                'messaging.delete_confirm_title': 'Delete message',
                'messaging.delete_confirm_body': 'Are you sure you want to delete this message?',
                'messaging.delete_irreversible': 'This action cannot be undone.',
                'messaging.cancel': 'Cancel',
                'messaging.type.info': 'Information',
                'messaging.type.warning': 'Warning',
                'messaging.type.ban': 'Ban',
                'messaging.type.thank': 'Thank you',
                'messaging.type.global': 'Global announcement',
                
                // Profile page
                'profile.search_placeholder': 'Search for a manga...',
                'profile.search_manga': 'Manga',
                'profile.search_anime': 'Anime',
                'profile.search_movie': 'Movie',
                'profile.search_user': 'User',
                'profile.search_aria': 'Search',
                'profile.menu_aria': 'Menu',
                'profile.avatar_alt': 'User avatar',
                'profile.followers': 'Followers',
                'profile.following': 'Following',
                'profile.subscribe': 'Subscribe',
                'profile.subscribed': 'Subscribed',
                'profile.add_to_top10': 'Add to top 10',
                'profile.top10_choose_slot': 'Choose a slot for "{{title}}" in your Top 10',
                'profile.top10_slot_empty': 'Empty',
                'profile.top10_move': 'Move',
                'profile.top10_remove': 'Remove',
                'profile.top10_place_hint': 'Click "..." then the button to add to top 10',
                'profile.top10_no_card_selected': 'No card selected. Please try again.',
                'profile.top10_must_be_logged_in': 'You must be logged in to add to top 10.',
                'profile.top10_card_no_longer_exists': 'The selected card no longer exists. Please try again.',
                'profile.top10_save_error': 'Unable to save top 10. Please try again.',
                'profile.top10_display_error': 'Error displaying top 10 interface.',
                'profile.description_placeholder': 'Write your description here...',
                'profile.edit_description': 'Edit description',
                'profile.certified_account': 'Verified account',
                'profile.banner_alt': 'Profile banner',
                'profile.not_set': 'Not set',
                'profile.no_description': 'No description',
                'profile.edit_banner': 'Edit banner',
                'profile.choose_image': 'Choose an image',
                'profile.choose_video': 'Choose a video',
                'profile.mute_sound': 'Mute sound',
                'profile.remove_banner': 'Remove banner',
                'profile.close': 'Close',
                'profile.tab_anime_manga': 'Anime & Manga',
                'profile.tab_settings': 'Settings',
                'profile.settings_title': 'Settings',
                'profile.preferences': 'Preferences',
                'profile.profile_photo': 'Profile photo',
                'profile.banner_label': 'Profile banner',
                'profile.banner_video_volume': 'Banner video volume',
                'profile.modify': 'Edit',
                'profile.theme': 'Theme',
                'profile.theme_dark': 'Dark',
                'profile.theme_light': 'Light',
                'profile.privacy_subscriptions': 'Subscription privacy',
                'profile.hide_subscriptions': 'Hide my subscriptions from other users',
                'profile.account_info': 'Account information',
                'profile.pseudo': 'Username',
                'profile.email': 'Email address',
                'profile.save': 'Save',
                'profile.cancel': 'Cancel',
                'profile.reveal_email': 'Reveal email',
                'profile.edit_email': 'Edit email',
                'profile.edit_password': 'Edit password',
                'profile.new_password': 'New password',
                'profile.confirm_password': 'Confirm password',
                'profile.language': 'Language',
                'profile.edit_language': 'Edit language',
                'profile.continent': 'Continent',
                'profile.edit_continent': 'Edit continent',
                'profile.continent_europe': 'Europe',
                'profile.continent_north_america': 'North America',
                'profile.continent_south_america': 'South America',
                'profile.continent_africa': 'Africa',
                'profile.continent_asia': 'Asia',
                'profile.continent_oceania': 'Oceania',
                'profile.continent_antarctica': 'Antarctica',
                'profile.country': 'Country',
                'profile.edit_country': 'Edit country',
                'profile.country_modified_success': 'Country updated successfully!',
                'profile.join_date': 'Join date',
                'profile.blocked_users': 'Blocked users',
                'profile.no_blocked_users': 'No blocked users',
                'profile.unblock': 'Unblock',
                'profile.unblock_user': 'Unblock this user',
                'profile.account_actions': 'Account actions',
                'profile.logout': 'Log out',
                'profile.tier_list_create': 'Create your first tier lists to rank your favourite anime and manga!',
                'profile.no_followers': 'No followers yet.',
                'profile.no_following': 'No following yet.',
                'profile.settings.no_password': 'No password required',
                'profile.order_desc': 'Descending order',
                'profile.order_asc': 'Ascending order',
                'profile.type_all': 'All types',
                'profile.followers_modal_title': 'Followers',
                'profile.following_modal_title': 'Following',
                'profile.follows_hidden_followers': 'This user has chosen to hide their followers.',
                'profile.follows_hidden_following': 'This user has chosen to hide who they follow.',
                'profile.unblock_confirm': 'Do you really want to unblock',
                'profile.unblock_confirm_end': '? You will be able to see their profile and content again.',
                'profile.privacy_subscriptions_hint': 'Other users will not be able to see your followers and following',
                'profile.pseudo_edit_hint_30days': 'You can change your username (once every 30 days)',
                'profile.pseudo_cooldown_days': 'You can change your username in {{n}} day(s)',
                'profile.username_tooltip': 'You can change your username once every 30 days. Min 3 characters, max 20, letters, numbers, hyphens and underscores only, unique username.',
                'profile.password_label': 'Password',
                'profile.show_password': 'Show password',
                'profile.hide_password': 'Hide password',
                'profile.logout_confirm_title': 'Confirm logout',
                'profile.logout_confirm_message': 'Are you sure you want to log out?',
                'profile.logout_confirm_sub': 'You will need to log in again to access your account.',
                'profile.continent_modified_success': 'Continent updated successfully!',
                'profile.success': 'Success',
                
                // Authentication and registration
                'auth.thank_you_title': 'Thank you for joining us!',
                'auth.thank_you_description': 'Your registration allows us to offer you a personalized experience and keep you informed of the latest manga news.',
                'auth.suggestions_personalized': 'Personalized suggestions',
                'auth.tier_lists': 'Tier lists',
                'auth.community': 'Community',
                'auth.data_protection': 'Your data is protected and will never be shared with third parties.',
                
                // Pseudo validation messages
                'auth.pseudo_min_length': 'Username must contain at least 3 characters',
                'auth.pseudo_max_length': 'Username cannot exceed 20 characters',
                'auth.pseudo_invalid_chars': 'Username can only contain letters, numbers, hyphens and underscores',
                'auth.pseudo_forbidden_words': 'This username contains forbidden words',
                'auth.pseudo_variations_forbidden': 'This username contains forbidden word variations',
                'auth.pseudo_attached_chars_forbidden': 'This username contains forbidden attached characters',
                'auth.pseudo_already_taken': 'This username is already taken',
                'auth.pseudo_available': 'Username available!',
                
                // Authentication messages
                'auth.login': 'Login',
                'auth.register': 'Register',
                'auth.username': 'Username',
                'auth.email': 'Email address',
                'auth.password': 'Password',
                'auth.language': 'Language',
                'auth.continent': 'Continent',
                'auth.country': 'Country',
                'auth.choose_country': 'Choose your country',
                'auth.age_confirmation': 'I confirm I am over 18 years old',
                'auth.stay_connected': 'Stay connected',
                'auth.accept_terms': 'I accept the',
                'auth.terms_of_service': 'terms of service',
                'auth.privacy_policy': 'privacy policy',
                'auth.create_account': 'Create my account',
                
                // Navigation
                'nav.login': 'Login',
                'nav.register': 'Register',
                
                // Auteurs et leurs descriptions
                'author.naoki_urasawa': 'Naoki Urasawa (born 1960 in Tokyo) is a Japanese manga artist, writer, and musician, considered one of the greatest contemporary authors. He is famous for his psychological thrillers, complex plots, and deep characters. Urasawa began his career in 1983 and established himself with major works like Monster, 20th Century Boys, and Pluto.',
                'author.rumiko_takahashi': 'Rumiko Takahashi is one of the most popular manga artists in the world, known for her romantic comedies and fantasy works. She is the author of Ranma ½, Maison Ikkoku, InuYasha, and Urusei Yatsura.',
                'author.akira_toriyama': 'Akira Toriyama is the creator of Dragon Ball, one of the most influential manga in history, and Dr. Slump. His dynamic style and humor have marked generations of readers.',
                'author.clamp': 'CLAMP is a female collective of authors known for their fantastic universes, endearing characters, and crossovers. They are responsible for Card Captor Sakura, xxxHolic, Tsubasa Reservoir Chronicle…',
                'author.takehiko_inoue': 'Takehiko Inoue is famous for his sports and historical manga, notably Slam Dunk, Vagabond, and Real. His realistic drawing and sense of movement are praised worldwide.',
                'author.hiromu_arakawa': 'Hiromu Arakawa, born in 1973 in Hokkaidō, is a Japanese manga artist worldwide known for Fullmetal Alchemist. Coming from a farming family, she has managed to impose a realistic, dynamic, and humorous style.',
                'author.masashi_kishimoto': 'Masashi Kishimoto, born in 1974 in Okayama Prefecture, is the creator of Naruto, one of the most popular manga of all time. Passionate about drawing since childhood, he draws inspiration from Akira Toriyama and Japanese culture to create a rich ninja universe.',
                'author.yoshihiro_togashi': 'Yoshihiro Togashi, born in 1966 in Shinjō, is a Japanese manga artist famous for Yu Yu Hakusho and Hunter x Hunter. He is known for his complex plots, nuanced characters, and ability to surprise the reader.',
                'author.hajime_isayama': 'Hajime Isayama, born in 1986 in Oita Prefecture, is the author of Attack on Titan (Shingeki no Kyojin), a worldwide phenomenon. His manga, started in 2009, has captivated millions of readers with its dark universe and plot twists.',
                'author.osamu_tezuka': 'Osamu Tezuka (1928-1989) is considered the "god of manga." A doctor by training, he revolutionized Japanese comics from the 1940s with a cinematic style, expressive characters, and profound stories.',
                
                // Œuvres des auteurs
                'work.monster': 'A gripping thriller about tracking a serial killer in Germany.',
                'work.20th_century_boys': 'A science fiction and conspiracy story, between childhood and apocalypse.',
                'work.pluto': 'A mature reinterpretation of Astro Boy, mixing investigation and reflection on humanity.',
                'work.ranma': 'A martial arts comedy and misunderstandings around a boy who transforms into a girl.',
                'work.inuyasha': 'A fantasy shōnen mixing romance, action, and Japanese folklore.',
                'work.urusei_yatsura': 'A cult series of science fiction and crazy humor.',
                'work.dragon_ball': 'The epic adventure of Son Goku in search of the Dragon Balls.',
                'work.dr_slump': 'An absurd comedy in Penguin Village with the little robot Arale.',
                'work.sand_land': 'A one-shot adventure in a desert world.',
                'work.card_captor_sakura': 'The magical story of Sakura, card hunter.',
                'work.xxxholic': 'A supernatural and mysterious manga, crossed with Tsubasa.',
                'work.tsubasa': 'An adventure through CLAMP\'s parallel worlds.',
                'work.slam_dunk': 'The basketball manga that revolutionized the genre.',
                'work.vagabond': 'A historical fresco about the samurai Miyamoto Musashi.',
                'work.real': 'A manga about disability sports and resilience.',
                'work.fullmetal_alchemist': 'A cult shōnen mixing alchemy, adventure, and reflection on humanity.',
                'work.silver_spoon': 'A realistic and funny dive into the Japanese agricultural world.',
                'work.arslan': 'An epic fresco adapted from a historical fantasy novel.',
                'work.naruto': 'The story of a rejected young ninja who dreams of becoming Hokage.',
                'work.boruto': 'The sequel to Naruto, centered on the new generation of ninjas.',
                'work.samurai_8': 'A science fiction manga mixing samurai and futuristic universe.',
                'work.hunter_x_hunter': 'Gon\'s adventure in search of his father in a hunter world.',
                'work.yu_yu_hakusho': 'A supernatural shōnen where a teenager becomes a spirit detective.',
                'work.level_e': 'An offbeat and unpredictable science fiction comedy.',
                'work.attack_on_titan': 'Humanity fights for survival against man-eating titans.',
                'work.heart_break_one': 'A youth one-shot, testimony to Isayama\'s beginnings.',
                'work.orz': 'Another short story, published before the success of the Titans.',
                'work.astro_boy': 'The most famous robot in manga, symbol of humanism and adventure.',
                'work.black_jack': 'A genius surgeon, hero of medical and moral stories.',
                'work.phoenix': 'A philosophical fresco about life, death, and reincarnation.',
                
                // Questions du quiz (quelques exemples)
                'quiz.hunter_nen_creator': 'In Hunter x Hunter, what is the name of the creator of Nen?',
                'quiz.hunter_nen_choices': ['Isaac Netero', 'Don Freecss', 'Zigg Zoldyck', 'Maha Zoldyck'],
                'quiz.onepiece_blackbeard': 'In One Piece, what is Blackbeard\'s real name?',
                'quiz.onepiece_blackbeard_choices': ['Edward Newgate', 'Portgas D. Ace', 'Marshall D. Teach', 'Rocks D. Xebec'],
                'quiz.deathnote_l_real_name': 'In Death Note, what is L\'s real name?',
                'quiz.deathnote_l_choices': ['Hideki Ryuga', 'Nate River', 'Mello', 'L Lawliet'],
                'quiz.fullmetal_father': 'In Fullmetal Alchemist, what is the name of Edward and Alphonse\'s father?',
                'quiz.fullmetal_father_choices': ['King Bradley', 'Van Hohenheim', 'Scar', 'Maes Hughes'],
                'quiz.naruto_byakugan_clan': 'In Naruto, what is the name of the clan possessing the Byakugan?',
                'quiz.naruto_byakugan_choices': ['Senju', 'Aburame', 'Hyuga', 'Uchiha'],
                'quiz.myhero_allmight': 'In My Hero Academia, what is All Might\'s real name?',
                'quiz.myhero_allmight_choices': ['Shota Aizawa', 'Toshinori Yagi', 'Enji Todoroki', 'Tenya Iida'],
                'quiz.attack_titan_original': 'In Attack on Titan, who is the first holder of the Original Titan?',
                'quiz.attack_titan_original_choices': ['Eren Jaeger', 'Ymir Fritz', 'Grisha Jaeger', 'Frieda Reiss'],
                'quiz.jojo_jotaro_stand': 'In JoJo\'s Bizarre Adventure, what is Jotaro Kujo\'s Stand?',
                'quiz.jojo_jotaro_stand_choices': ['The World', 'Crazy Diamond', 'Star Platinum', 'Killer Queen'],
                'quiz.demonslayer_giyu_breath': 'In Demon Slayer, what breath does Giyu Tomioka use?',
                'quiz.demonslayer_giyu_breath_choices': ['Flame Breathing', 'Moon Breathing', 'Water Breathing', 'Thunder Breathing']
            },
            de: {
                // Navigation essentielle
                'nav.home': 'Startseite',
                'nav.manga_anime': 'Manga & Anime',
                'nav.collection': 'Sammlung',
                'nav.profile': 'Profil',
                'nav.tierlist': 'Tier Liste',
                'nav.forum': 'Forum',
                
                // Titres de pages essentiels
                'catalogue.title.manga': 'Manga',
                'catalogue.title.anime': 'Anime',
                'collection.title': 'Meine Sammlung',
                'collection.subtitle': 'Verwalte deine Lieblingsmanga und Anime',
                
                // Filtres essentiels
                'type': 'Typ',
                'status': 'Status',
                'sort': 'Sortieren nach',
                'reset': 'Zurücksetzen',
                
                // Options de filtre essentielles
                'manga': 'Manga',
                'anime': 'Anime',
                'novel': 'Roman',
                'doujin': 'Doujin',
                'manhwa': 'Manhwa',
                'manhua': 'Manhua',
                'all_status': 'Alle Status',
                'watching': 'Schauen',
                'completed': 'Abgeschlossen',
                'on_hold': 'Pausiert',
                'dropped': 'Eingestellt',
                'plan_to_watch': 'Geplant',
                'score': 'Beste Bewertung',
                'popularity': 'Beliebteste',
                
                // Types d'anime
                'anime_type': 'Anime-Typ',
                'all_anime_types': 'Alle Anime-Typen',
                'tv': 'TV',
                'movie': 'Film',
                'ova': 'OVA',
                'special': 'Special',
                'ona': 'ONA',
                'music': 'Musikvideo',
                
                // Statuts
                'watching': 'Schauen',
                'completed': 'Abgeschlossen',
                'on_hold': 'Pausiert',
                'dropped': 'Eingestellt',
                'plan_to_watch': 'Geplant',
                
                // Tri
                'score': 'Beste Bewertung',
                'popularity': 'Beliebteste',
                'genre_sort': 'Nach Genre sortieren',
                'no_synopsis_available': 'Keine Beschreibung verfügbar',
                
                // Types d'anime
                'anime_type': 'Tipo de Anime',
                'all_anime_types': 'Todos los Tipos de Anime',
                'tv': 'TV',
                'movie': 'Película',
                'ova': 'OVA',
                'special': 'Especial',
                'ona': 'ONA',
                'music': 'Música',
                
                // Statuts
                'watching': 'Viendo',
                'completed': 'Completado',
                'on_hold': 'En Pausa',
                'dropped': 'Abandonado',
                'plan_to_watch': 'Plan para Ver',
                
                // Tri
                'score': 'Mejor Puntuación',
                'popularity': 'Más Populares',
                'genre_sort': 'Ordenar por género',
                'no_synopsis_available': 'Sinopsis no disponible',
                
                // Types d'anime
                'anime_type': 'Tipo di Anime',
                'all_anime_types': 'Tutti i Tipi di Anime',
                'tv': 'TV',
                'movie': 'Film',
                'ova': 'OVA',
                'special': 'Speciale',
                'ona': 'ONA',
                'music': 'Musica',
                
                // Statuts
                'watching': 'Guardando',
                'completed': 'Completato',
                'on_hold': 'In Pausa',
                'dropped': 'Abbandonato',
                'plan_to_watch': 'Pianificato',
                
                // Tri
                'score': 'Miglior Punteggio',
                'popularity': 'Più Popolari',
                'genre_sort': 'Ordina per genere',
                'no_synopsis_available': 'Nessuna sinossi disponibile',
                
                // Types d'anime
                'anime_type': 'アニメタイプ',
                'all_anime_types': 'すべてのアニメタイプ',
                'tv': 'TV',
                'movie': '映画',
                'ova': 'OVA',
                'special': 'スペシャル',
                'ona': 'ONA',
                'music': '音楽',
                
                // Statuts
                'watching': '視聴中',
                'completed': '完了',
                'on_hold': '一時停止',
                'dropped': '視聴中止',
                'plan_to_watch': '視聴予定',
                
                // Tri
                'score': '最高評価',
                'popularity': '人気順',
                'genre_sort': 'ジャンルで並べ替え',
                'no_synopsis_available': 'あらすじなし',
                
                // Autres options
                'rating': 'Mindestbewertung',
                'relevance': 'Relevanz',
                'title': 'Alphabetische Reihenfolge',
                'start_date': 'Erscheinungsdatum',
                
                // Pagination
                'pagination.previous': 'Zurück',
                'pagination.next': 'Weiter',
                
                // Modal de statut
                'collection.status_modal.title': 'Status wählen',
                'collection.status.watching': 'Schauen',
                'collection.status.completed': 'Abgeschlossen',
                'collection.status.on_hold': 'Pausiert',
                'collection.status.dropped': 'Eingestellt',
                'collection.status.plan_to_watch': 'Geplant',
                
                // Messages essentiels
                'message.loading': 'Laden...',
                'message.error': 'Ein Fehler ist aufgetreten',
                'message.no_results': 'Keine Ergebnisse gefunden',
                
                // Barre de recherche
                'search.placeholder': 'Nach einem Anime oder Manga suchen...',
                
                // Collection essentielle
                'collection.filter.all': 'Alle',
                'collection.filter.watching': 'Schauen',
                'collection.filter.completed': 'Abgeschlossen',
                'collection.filter.on_hold': 'Pausiert',
                'collection.filter.dropped': 'Eingestellt',
                'collection.filter.plan_to_watch': 'Geplant',
                'user_profile.tab_anime_manga': 'Anime & Manga',
                'user_profile.tab_collection': 'Sammlung',
                'user_profile.empty_title': 'Keine Einträge in dieser Sammlung',
                'user_profile.empty_text': 'Füge Anime und Manga zu deiner Sammlung hinzu!',
                'user_profile.user_not_found': 'Benutzer nicht gefunden',
                'user_profile.user_not_found_desc': 'Der gesuchte Benutzer existiert nicht.',
                'user_profile.back_home': 'Zurück zur Startseite',
                'user_profile.no_cards': 'Keine Karten anzuzeigen.',
                'collection.type.all': 'Alle Typen',
                'collection.type.anime': 'Anime',
                'collection.type.manga': 'Manga',
                'collection.type.novel': 'Roman',
                'collection.type.roman': 'Roman',
                'collection.type.doujin': 'Doujin',
                'collection.type.manhwa': 'Manhwa',
                'collection.type.manhua': 'Manhua',
                'collection.type.film': 'Film',
                'collection.label_episodes': 'Episoden',
                'collection.label_volumes': 'Bände',
                'collection.stats.watching': 'Schauen',
                'collection.stats.completed': 'Abgeschlossen',
                'collection.stats.on_hold': 'Pausiert',
                'collection.stats.dropped': 'Eingestellt',
                'collection.stats.plan_to_watch': 'Geplant',
                
                // Éléments de la page collection
                'collection.change_status': 'Status ändern',
                'collection.remove_from_list': 'Von Liste entfernen',
                'collection.status_modal.title': 'Status ändern',
                'collection.status_modal.add_title': 'Zur Liste hinzufügen',
                'collection.status.watching': 'Schauen',
                'collection.status.completed': 'Abgeschlossen',
                'collection.status.on_hold': 'Pausiert',
                'collection.status.dropped': 'Eingestellt',
                'collection.status.plan_to_watch': 'Geplant',
                'collection.status.watching_desc': 'Du schaust gerade',
                'collection.status.completed_desc': 'Du hast abgeschlossen',
                'collection.status.on_hold_desc': 'Du hast pausiert',
                'collection.status.dropped_desc': 'Du hast eingestellt',
                'collection.status.plan_to_watch_desc': 'Du möchtest schauen',
                'collection.stopped_at.label': 'Wo haben Sie aufgehört?',
                'collection.stopped_at.episode': 'Folge',
                'collection.stopped_at.chapter': 'Kapitel',
                'collection.stopped_at.volume': 'Band',
                'collection.stopped_at.hint': 'Geben Sie die Folgen- oder Bandnummer ein, bei der Sie aufgehört haben',
                'collection.confirm_status': 'Bestätigen',
                'collection.empty.title': 'Deine Liste ist leer',
                'collection.empty.subtitle': 'Beginne damit, Manga und Anime zu deiner Liste hinzuzufügen!',
                'collection.empty.cta': 'Manga entdecken',
                'collection.delete.confirm_title': 'Löschung bestätigen',
                'collection.delete.confirm_message': 'Bist du sicher, dass du diesen Artikel von deiner Liste entfernen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.',
                'collection.delete.cancel': 'Abbrechen',
                'collection.delete.confirm': 'Löschen',
                'collection.pagination.display': 'Anzeige von {start}-{end} von {total} Artikeln',
                'collection.pagination.previous': 'Zurück',
                'collection.pagination.next': 'Weiter',
                
                // Profil melden
                'profile.report': 'Melden',
                'profile.report.title': 'Benutzer melden',
                'profile.report.subtitle': 'Warum melden Sie diesen Benutzer?',
                'profile.report.reason.harassment': 'Belästigung oder toxisches Verhalten',
                'profile.report.reason.spam': 'Spam oder unaufgeforderte Werbung',
                'profile.report.reason.inappropriate': 'Anstößige oder unangemessene Inhalte',
                'profile.report.reason.fake': 'Konto, das jemand anderen nachahmt',
                'profile.report.reason.other': 'Anderer Grund',
                'profile.report.comment.label': 'Details (optional)',
                'profile.report.submit': 'Melden',
                'profile.report.block': 'Blockieren',
                
                // Paramètres de profil
                'profile.settings.google_auth': 'Google-Authentifizierung',
                'profile.settings.no_password': 'Kein Passwort erforderlich',
                
                // Filtres de note
                'all_ratings': 'Alle Bewertungen',
                'min_score_7': 'Mindestbewertung 7',
                'min_score_8': 'Mindestbewertung 8',
                'min_score_9': 'Mindestbewertung 9',
                'min_score_10': 'Mindestbewertung 10',
                
                // Pages de détail (sans préfixes)
                'title': 'Details',
                'back_to_catalogue': 'Zurück zum Katalog',
                'loading': 'Laden...',
                'no_manga_selected': 'Kein Manga ausgewählt. Bitte kehren Sie zum Katalog zurück.',
                'no_anime_selected': 'Kein Anime ausgewählt. Bitte kehren Sie zum Katalog zurück.',
                'load_error': 'Beim Laden der Details ist ein Fehler aufgetreten.',
                'no_genre': 'Kein Genre angegeben',
                'no_theme': 'Kein Thema angegeben',
                'no_characters': 'Keine Charaktere gefunden.',
                'type': 'Typ',
                'your_rating': 'Ihre Bewertung:',
                'cancel': 'Abbrechen',
                'click_to_rate': 'Klicken Sie auf die Sterne zum Bewerten',
                'potential_rating': 'Potenzielle Bewertung:',
                'synopsis': 'Synopsis',
                'genres': 'Genres',
                'general_info': 'Allgemeine Informationen',
                'original_title': 'Originaltitel:',
                'english_title': 'Englischer Titel:',
                'authors': 'Autor(en):',
                'chapters': 'Kapitel:',
                'volumes': 'Bände:',
                'year': 'Jahr:',
                'publication_date': 'Veröffentlichungsdatum:',
                'popularity': 'Beliebtheit',
                'rank': 'Rang',
                'members': 'Mitglieder',
                'favorites': 'Favoriten',
                'episodes': 'Episoden',
                'duration': 'Dauer',
                'season': 'Staffel',
                'start_date': 'Startdatum',
                'end_date': 'Enddatum:',
                'broadcast': 'Ausstrahlung:',
                'source': 'Quelle:',
                'studios': 'Studios:',
                'votes': 'Stimmen:',
                
                // Titres alternatifs (sans préfixe)
                'alternative_titles': 'Alternative Titel',
                'japanese_title': 'Japanischer Titel:',
                'french_title': 'Französischer Titel:',
                
                // Page d'accueil
                'home.hero_subtitle': 'Ihr ultimativer Ort zum Verfolgen und Bewerten Ihrer Lieblings-Anime und -Manga',
                'home.explore': 'Sammlung erkunden',
                'home.why_choose': 'Warum MangaWatch wählen?',
                'home.feature_catalogue_title': 'Vollständiger Katalog',
                'home.feature_catalogue_desc': 'Greifen Sie auf eine umfangreiche Sammlung von Anime und Manga zu, von zeitlosen Klassikern bis zu den neuesten Veröffentlichungen.',
                'home.feature_rating_title': 'Intelligente Bewertung',
                'home.feature_rating_desc': 'Bewerten Sie Ihre Lieblingswerke und helfen Sie der Community dabei, Juwelen zu entdecken.',
                'home.feature_tierlist_title': 'Benutzerdefinierte Tier-Listen',
                'home.feature_tierlist_desc': 'Erstellen und teilen Sie Ihre eigenen Anime- und Charakter-Ranglisten.',
                
                // Auteur du jour
                'home.author_of_week': 'Autor der Woche',
                'home.author_bio': 'Biographie',
                'home.author_works': 'Hauptwerke',
                'home.author_follow': 'Folgen',
                'home.author_unfollow': 'Nicht mehr folgen',
                
                // Vote du jour
                'home.vote_title': 'Stimme für den Anime ab, den du heute am besten findest!',
                'home.vote_title_manga': 'Stimme für den Manga ab, den du heute am besten findest!',
                'home.vote_type_anime': 'Abstimmung des Tages: Anime',
                'home.vote_type_manga': 'Abstimmung des Tages: Manga',
                'home.vote_button': 'Abstimmen',
                'home.vote_voted': '✓ Abgestimmt',
                'home.vote_already_voted': 'Bereits abgestimmt',
                'home.vote_votes': 'Stimme',
                'home.vote_votes_plural': 'Stimmen',
                'home.vote_already_voted_message': 'Sie haben heute bereits abgestimmt! Kommen Sie morgen wieder, um erneut abzustimmen.',
                
                // Section Vote du Jour
                'home.vote_of_day': 'Abstimmung des Tages',
                'home.vote_description': 'Welchen Anime/Manga bevorzugen Sie heute?',
                'home.vote_results': 'Abstimmungsergebnisse',
                'home.vote_new_vote': 'Neue Abstimmung',
                'home.vote_already_voted_today': 'Sie haben heute bereits abgestimmt!',
                'home.vote_reset_tomorrow': 'Sie können die Abstimmung morgen zurücksetzen!',
                
                // Nouveaux membres
                'home.new_members': 'Neue Mitglieder',
                
                // Quiz du jour
                'home.quiz_title': 'Quiz des Tages',
                'home.quiz_validate': 'Meine Antwort bestätigen',
                'home.quiz_correct': 'Richtig!',
                'home.quiz_incorrect': 'Falsch!',
                'home.quiz_correct_answer': 'Die richtige Antwort war:',
                'home.quiz_continue': 'Weiter',
                'home.quiz_select_answer': 'Bitte wählen Sie eine Antwort!',
                'home.quiz_question_progress': 'Frage {current} von {total} • Neue Frage morgen!',
                'home.quiz_error': 'Quiz kann derzeit nicht geladen werden.',
                
                // Nouveaux utilisateurs
                'home.new_users': 'Neue Benutzer',
                'home.new_users_error': 'Neue Benutzer können derzeit nicht geladen werden.',
                'home.new_users_error_retry': 'Bitte versuchen Sie es später erneut.',
                'home.new_users_stat_animes': 'Animes',
                'home.new_users_stat_mangas': 'Mangas',
                'home.new_users_stat_tierlists': 'Tier-Listen',
                'home.new_users_join_days_ago': 'Vor {days} Tagen',
                'home.new_users_join_week_ago': 'Vor 1 Woche',
                'home.new_users_join_weeks_ago': 'Vor {weeks} Wochen',
                
                // Footer
                'footer.copyright': '©',
                'footer.all_rights_reserved': 'Alle Rechte vorbehalten',
                'footer.made_by': 'Erstellt von',
                
                // Hilfe / Tickets
                'help.title': 'Hilfe - Problem melden',
                'help.ticket_title': 'Hilfe - Problem melden',
                'help.ticket_subject': 'Betreff',
                'help.ticket_message': 'Beschreiben Sie Ihr Problem',
                'help.ticket_send': 'Ticket senden',
                'help.ticket_cancel': 'Abbrechen',
                'help.close': 'Schließen',
                'help.ticket_success': 'Ihr Ticket wurde gesendet. Wir melden uns bei Bedarf.',
                'help.ticket_error': 'Ein Fehler ist aufgetreten. Kontakt: mangawatch.off@gmail.com',
                'help.ticket_login': 'Melden Sie sich an, um ein Ticket zu senden, oder schreiben Sie an mangawatch.off@gmail.com',
                'help.my_tickets': 'Meine Tickets',
                'help.new_ticket': 'Neues Ticket',
                'help.placeholder_subject': 'z. B. Login-Problem, Fehler auf der Sammlungsseite...',
                'help.placeholder_message': 'Beschreiben Sie das Problem im Detail...',
                'help.loading': 'Laden…',
                'help.loading_tickets': 'Ihre Tickets werden geladen…',
                'help.login_to_see': 'Melden Sie sich an, um Ihre Tickets anzuzeigen und zu verwalten.',
                'help.service_unavailable': 'Dienst nicht verfügbar.',
                'help.no_tickets': 'Sie haben keine Tickets. Erstellen Sie eines unter „Neues Ticket“.',
                'help.closed': 'Geschlossen',
                'help.in_progress': 'In Bearbeitung',
                'help.no_subject': 'Kein Betreff',
                'help.back_to_list': 'Zurück zur Liste',
                'help.your_message': 'Ihre Nachricht',
                'help.support': 'Support',
                'help.you': 'Sie',
                'help.your_reply': 'Ihre Antwort',
                'help.send_reply': 'Senden',
                'help.close_ticket_btn': 'Ticket schließen',
                'help.conversation_closed': 'Unterhaltung geschlossen',
                'help.conversation_closed_desc': 'Dieses Ticket nimmt keine Antworten mehr an. Sie können nur den Verlauf oben einsehen.',
                'help.close_ticket_confirm_title': 'Dieses Ticket schließen?',
                'help.close_ticket_confirm_desc': 'Nach dem Schließen können Sie nicht mehr antworten. Die Unterhaltung bleibt nur lesbar.',
                'help.close_ticket_confirm_btn': 'Ticket schließen',
                'help.ticket_closed_toast': 'Ticket geschlossen. Die Unterhaltung bleibt nur lesbar.',
                'help.reply_sent': 'Antwort gesendet.',
                'help.reply_to_your_ticket': 'Antwort auf Ihr Ticket',
                'help.reply_error': 'Fehler beim Senden.',
                'help.close_error': 'Fehler beim Schließen.',
                'help.load_error': 'Tickets konnten nicht geladen werden. Bitte später erneut versuchen.',
                'help.load_error_index': 'Konfiguration nötig: Firestore-Indizes bereitstellen, dann erneut versuchen.',
                'help.load_error_permission': 'Zugriff verweigert. Stellen Sie sicher, dass Sie mit dem Konto Ihrer Tickets angemeldet sind.',
                'help.tickets_not_enabled_confirm': 'Tickets sind serverseitig noch nicht aktiviert. E-Mail-Programm öffnen, um uns zu kontaktieren?',
                'messaging.title': 'Nachrichten',
                'messaging.aria_label': 'Nachrichten',
                'messaging.loading': 'Nachrichten werden geladen...',
                'messaging.empty': 'Keine Nachrichten momentan',
                'messaging.back': 'Zurück',
                'messaging.mark_all_read': 'Alle als gelesen markieren',
                'messaging.load_error': 'Fehler beim Laden der Nachrichten',
                'messaging.delete_error': 'Fehler beim Löschen der Nachricht.',
                'messaging.delete': 'Löschen',
                'messaging.delete_confirm_title': 'Nachricht löschen',
                'messaging.delete_confirm_body': 'Möchten Sie diese Nachricht wirklich löschen?',
                'messaging.delete_irreversible': 'Diese Aktion kann nicht rückgängig gemacht werden.',
                'messaging.cancel': 'Abbrechen',
                'messaging.type.info': 'Information',
                'messaging.type.warning': 'Warnung',
                'messaging.type.ban': 'Sperre',
                'messaging.type.thank': 'Dankeschön',
                'messaging.type.global': 'Globale Ankündigung',
                
                // Profil
                'profile.search_placeholder': 'Manga suchen...',
                'profile.search_manga': 'Manga',
                'profile.search_anime': 'Anime',
                'profile.search_movie': 'Film',
                'profile.search_user': 'Benutzer',
                'profile.search_aria': 'Suchen',
                'profile.menu_aria': 'Menü',
                'profile.avatar_alt': 'Benutzer-Avatar',
                'profile.followers': 'Abonnenten',
                'profile.following': 'Abonnements',
                'profile.subscribe': 'Abonnieren',
                'profile.subscribed': 'Abonniert',
                'profile.add_to_top10': 'Zum Top 10 hinzufügen',
                'profile.top10_choose_slot': 'Wählen Sie einen Platz für "{{title}}" in Ihrer Top 10',
                'profile.top10_slot_empty': 'Leer',
                'profile.top10_move': 'Verschieben',
                'profile.top10_remove': 'Entfernen',
                'profile.top10_place_hint': 'Klicken Sie auf "..." und dann auf die Schaltfläche, um zur Top 10 hinzuzufügen',
                'profile.top10_no_card_selected': 'Keine Karte ausgewählt. Bitte versuchen Sie es erneut.',
                'profile.top10_must_be_logged_in': 'Sie müssen angemeldet sein, um zur Top 10 hinzuzufügen.',
                'profile.top10_card_no_longer_exists': 'Die ausgewählte Karte existiert nicht mehr. Bitte versuchen Sie es erneut.',
                'profile.top10_save_error': 'Top 10 konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.',
                'profile.top10_display_error': 'Fehler beim Anzeigen der Top-10-Oberfläche.',
                'profile.description_placeholder': 'Beschreibung hier schreiben...',
                'profile.edit_description': 'Beschreibung bearbeiten',
                'profile.certified_account': 'Verifizierter Account',
                'profile.banner_alt': 'Profilbanner',
                'profile.not_set': 'Nicht angegeben',
                'profile.no_description': 'Keine Beschreibung',
                'profile.edit_banner': 'Banner bearbeiten',
                'profile.choose_image': 'Bild wählen',
                'profile.choose_video': 'Video wählen',
                'profile.mute_sound': 'Ton aus',
                'profile.remove_banner': 'Banner entfernen',
                'profile.close': 'Schließen',
                'profile.tab_anime_manga': 'Anime & Manga',
                'profile.tab_settings': 'Einstellungen',
                'profile.settings_title': 'Einstellungen',
                'profile.preferences': 'Präferenzen',
                'profile.profile_photo': 'Profilfoto',
                'profile.banner_label': 'Profilbanner',
                'profile.banner_video_volume': 'Banner-Videolautstärke',
                'profile.modify': 'Bearbeiten',
                'profile.theme': 'Design',
                'profile.theme_dark': 'Dunkel',
                'profile.theme_light': 'Hell',
                'profile.privacy_subscriptions': 'Privatsphäre Abonnements',
                'profile.hide_subscriptions': 'Meine Abonnements vor anderen verbergen',
                'profile.account_info': 'Kontoinformationen',
                'profile.pseudo': 'Benutzername',
                'profile.email': 'E-Mail',
                'profile.save': 'Speichern',
                'profile.cancel': 'Abbrechen',
                'profile.reveal_email': 'E-Mail anzeigen',
                'profile.edit_email': 'E-Mail bearbeiten',
                'profile.edit_password': 'Passwort ändern',
                'profile.new_password': 'Neues Passwort',
                'profile.confirm_password': 'Passwort bestätigen',
                'profile.language': 'Sprache',
                'profile.edit_language': 'Sprache bearbeiten',
                'profile.continent': 'Kontinent',
                'profile.edit_continent': 'Kontinent bearbeiten',
                'profile.continent_europe': 'Europa',
                'profile.continent_north_america': 'Nordamerika',
                'profile.continent_south_america': 'Südamerika',
                'profile.continent_africa': 'Afrika',
                'profile.continent_asia': 'Asien',
                'profile.continent_oceania': 'Ozeanien',
                'profile.continent_antarctica': 'Antarktis',
                'profile.country': 'Land',
                'profile.edit_country': 'Land bearbeiten',
                'profile.country_modified_success': 'Land erfolgreich geändert!',
                'profile.join_date': 'Beitrittsdatum',
                'profile.blocked_users': 'Blockierte Benutzer',
                'profile.no_blocked_users': 'Keine blockierten Benutzer',
                'profile.unblock': 'Entblockieren',
                'profile.unblock_user': 'Diesen Benutzer entblockieren',
                'profile.account_actions': 'Kontoaktionen',
                'profile.logout': 'Abmelden',
                'profile.tier_list_create': 'Erstellen Sie Ihre ersten Tier-Listen für Ihre Lieblings-Anime und -Manga!',
                'profile.no_followers': 'Noch keine Abonnenten.',
                'profile.no_following': 'Noch keine Abonnements.',
                'profile.settings.no_password': 'Kein Passwort erforderlich',
                'profile.order_desc': 'Absteigende Reihenfolge',
                'profile.order_asc': 'Aufsteigende Reihenfolge',
                'profile.type_all': 'Alle Typen',
                'profile.followers_modal_title': 'Abonnenten',
                'profile.following_modal_title': 'Abonnements',
                'profile.follows_hidden_followers': 'Dieser Benutzer hat seine Abonnenten ausgeblendet.',
                'profile.follows_hidden_following': 'Dieser Benutzer hat seine Abonnements ausgeblendet.',
                'profile.unblock_confirm': 'Möchten Sie wirklich entblockieren',
                'profile.unblock_confirm_end': '? Sie können Profil und Inhalte wieder sehen.',
                'profile.privacy_subscriptions_hint': 'Andere Nutzer können Ihre Abonnenten und Abos nicht sehen',
                'profile.pseudo_edit_hint_30days': 'Sie können Ihren Benutzernamen ändern (alle 30 Tage einmal)',
                'profile.pseudo_cooldown_days': 'Sie können Ihren Benutzernamen in {{n}} Tag(en) ändern',
                'profile.username_tooltip': 'Sie können Ihren Benutzernamen alle 30 Tage einmal ändern. Min. 3, max. 20 Zeichen, nur Buchstaben, Zahlen, Bindestriche und Unterstriche, eindeutiger Name.',
                'profile.password_label': 'Passwort',
                'profile.show_password': 'Passwort anzeigen',
                'profile.hide_password': 'Passwort verbergen',
                'profile.logout_confirm_title': 'Abmeldung bestätigen',
                'profile.logout_confirm_message': 'Möchten Sie sich wirklich abmelden?',
                'profile.logout_confirm_sub': 'Sie müssen sich erneut anmelden, um auf Ihr Konto zuzugreifen.',
                'profile.continent_modified_success': 'Kontinent erfolgreich geändert!',
                'profile.success': 'Erfolg',
                
                // Authentifizierung und Registrierung
                'auth.thank_you_title': 'Vielen Dank, dass Sie sich uns angeschlossen haben!',
                'auth.thank_you_description': 'Ihre Registrierung ermöglicht es uns, Ihnen eine personalisierte Erfahrung zu bieten und Sie über die neuesten Manga-Nachrichten zu informieren.',
                'auth.suggestions_personalized': 'Personalisierte Vorschläge',
                'auth.tier_lists': 'Tier-Listen',
                'auth.community': 'Gemeinschaft',
                'auth.data_protection': 'Ihre Daten sind geschützt und werden niemals an Dritte weitergegeben.',
                
                // Benutzername-Validierungsnachrichten
                'auth.pseudo_min_length': 'Der Benutzername muss mindestens 3 Zeichen enthalten',
                'auth.pseudo_max_length': 'Der Benutzername darf 20 Zeichen nicht überschreiten',
                'auth.pseudo_invalid_chars': 'Der Benutzername darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten',
                'auth.pseudo_forbidden_words': 'Dieser Benutzername enthält verbotene Wörter',
                'auth.pseudo_variations_forbidden': 'Dieser Benutzername enthält verbotene Wortvariationen',
                'auth.pseudo_attached_chars_forbidden': 'Dieser Benutzername enthält verbotene angehängte Zeichen',
                'auth.pseudo_already_taken': 'Dieser Benutzername ist bereits vergeben',
                'auth.pseudo_available': 'Benutzername verfügbar!',
                
                // Authentifizierungsnachrichten
                'auth.login': 'Anmelden',
                'auth.register': 'Registrieren',
                'auth.username': 'Benutzername',
                'auth.email': 'E-Mail-Adresse',
                'auth.password': 'Passwort',
                'auth.language': 'Sprache',
                'auth.continent': 'Kontinent',
                'auth.country': 'Land',
                'auth.choose_country': 'Wählen Sie Ihr Land',
                'auth.age_confirmation': 'Ich bestätige, dass ich über 18 Jahre alt bin',
                'auth.stay_connected': 'Angemeldet bleiben',
                'auth.accept_terms': 'Ich akzeptiere die',
                'auth.terms_of_service': 'Nutzungsbedingungen',
                'auth.privacy_policy': 'Datenschutzrichtlinie',
                'auth.create_account': 'Mein Konto erstellen',
                
                // Navigation
                'nav.login': 'Anmelden',
                'nav.register': 'Registrieren',
                
                // Recherche
                'search.placeholder.manga': 'Nach einem Manga suchen...',
                'search.placeholder.anime': 'Nach einem Anime suchen...',
                'search.placeholder.movie': 'Nach einem Film suchen...',
                'search.placeholder.manhwa': 'Nach einem Manhwa suchen...',
                'search.placeholder.manhua': 'Nach einem Manhua suchen...',
                'search.placeholder.user': 'Nach einem Benutzer suchen...',
                'search.placeholder.generic': 'Suchen...',
                'search.aria_label': 'Suchen',
                'search.clear_aria': 'Suche löschen',
                
                // Options de recherche
                'search.type.manga': 'Manga',
                'search.type.anime': 'Anime',
                'search.type.movie': 'Film',
                'search.type.manhwa': 'Manhwa',
                'search.type.manhua': 'Manhua',
                'search.type.user': 'Benutzer',
                'search.results_for': 'Suchergebnisse für "{query}" ({count})',
                'search.results_for_genre': 'Suchergebnisse für Genre "{genre}" für "{query}" ({count})',
                'search.no_results_genre': 'Keine Ergebnisse für Genre "{genre}" für "{query}"',
                'search.no_results': 'Keine Ergebnisse für "{query}"',
                'search.result_one': '1 Ergebnis',
                'search.result_many': '{n} Ergebnisse',
                'common.pagination_prev': '← Zurück',
                'common.pagination_next': 'Weiter →',
                'genre.of_genre': 'Genre:',
                'genre.type_label': 'Typ:',
                'genre.content_mangas': 'Manga',
                'genre.content_animes': 'Anime',
                'genre.content_films': 'Filme',
                'genre.content_contents': 'Inhalte',
                'genre.content_manhwa': 'Manhwa',
                'genre.content_manhua': 'Manhua',
                'genre.content_all': 'Alle',
                'profile.rating_label': 'Note',
                'profile.not_rated': 'Nicht bewertet',
                'common.scroll_bottom': '↓ Unten',
                'common.scroll_top': '↑ Oben',
                'common.scroll_bottom_title': 'Nach unten scrollen',
                'common.scroll_top_title': 'Nach oben scrollen',
                
                // Messages généraux
                'common.loading_vote_options': 'Abstimmungsoptionen werden geladen...',
                
                // Vote du jour (détails)
                'home.vote_description_template': 'Welchen {type} bevorzugen Sie heute?',
                'home.vote_type_badge_anime': 'Abstimmung des Tages: Anime',
                'home.vote_type_badge_manga': 'Abstimmung des Tages: Manga',
                'home.vote_button_text': 'Abstimmen',
                'home.vote_count': 'Stimmen',
            },
            es: {
                // Navigation essentielle
                'nav.home': 'Inicio',
                'nav.manga_anime': 'Manga & Anime',
                'nav.collection': 'Colección',
                'nav.profile': 'Perfil',
                'nav.tierlist': 'Lista de Niveles',
                'nav.forum': 'Foro',
                
                // Titres de pages essentiels
                'catalogue.title.manga': 'Manga',
                'catalogue.title.anime': 'Anime',
                'collection.title': 'Mi Colección',
                'collection.subtitle': 'Gestiona tus manga y anime favoritos',
                
                // Filtres essentiels
                'type': 'Tipo',
                'status': 'Estado',
                'sort': 'Ordenar por',
                'reset': 'Restablecer',
                
                // Options de filtre essentielles
                'manga': 'Manga',
                'anime': 'Anime',
                'novel': 'Novela',
                'doujin': 'Doujin',
                'manhwa': 'Manhwa',
                'manhua': 'Manhua',
                'all_status': 'Todos los estados',
                'watching': 'Viendo',
                'completed': 'Completado',
                'on_hold': 'En Pausa',
                'dropped': 'Abandonado',
                'plan_to_watch': 'Por Ver',
                'score': 'Mejor Puntuación',
                'popularity': 'Más Populares',
                
                // Types d'anime
                'anime_type': 'Tipo de Anime',
                'all_anime_types': 'Todos los tipos de anime',
                'tv': 'TV',
                'movie': 'Película',
                'ova': 'OVA',
                'special': 'Especial',
                'ona': 'ONA',
                'music': 'Video Musical',
                
                // Autres options
                'rating': 'Puntuación Mínima',
                'relevance': 'Relevancia',
                'title': 'Orden Alfabético',
                'start_date': 'Fecha de Lanzamiento',
                
                // Pagination
                'pagination.previous': 'Anterior',
                'pagination.next': 'Siguiente',
                
                // Modal de statut
                'collection.status_modal.title': 'Elegir un estado',
                'collection.status.watching': 'Viendo',
                'collection.status.completed': 'Completado',
                'collection.status.on_hold': 'En Pausa',
                'collection.status.dropped': 'Abandonado',
                'collection.status.plan_to_watch': 'Por Ver',
                
                // Messages essentiels
                'message.loading': 'Cargando...',
                'message.error': 'Ha ocurrido un error',
                'message.no_results': 'No se encontraron resultados',
                
                // Barre de recherche
                'search.placeholder': 'Buscar un anime o manga...',
                'search.placeholder.manga': 'Buscar un manga...',
                'search.placeholder.anime': 'Buscar un anime...',
                'search.placeholder.movie': 'Buscar una película...',
                'search.placeholder.manhwa': 'Buscar un manhwa...',
                'search.placeholder.manhua': 'Buscar un manhua...',
                'search.placeholder.user': 'Buscar un usuario...',
                'search.placeholder.generic': 'Buscar...',
                'search.aria_label': 'Buscar',
                'search.clear_aria': 'Borrar búsqueda',
                
                // Options de recherche
                'search.type.manga': 'Manga',
                'search.type.anime': 'Anime',
                'search.type.movie': 'Película',
                'search.type.manhwa': 'Manhwa',
                'search.type.manhua': 'Manhua',
                'search.type.user': 'Usuario',
                'search.results_for': 'Resultados de búsqueda para "{query}" ({count})',
                'search.results_for_genre': 'Resultados de búsqueda para el género "{genre}" para "{query}" ({count})',
                'search.no_results_genre': 'Ningún resultado para el género "{genre}" para "{query}"',
                'search.no_results': 'Ningún resultado para "{query}"',
                'search.result_one': '1 resultado',
                'search.result_many': '{n} resultados',
                'common.pagination_prev': '← Anterior',
                'common.pagination_next': 'Siguiente →',
                'genre.of_genre': 'del género:',
                'genre.type_label': 'Tipo:',
                'genre.content_mangas': 'Mangas',
                'genre.content_animes': 'Animes',
                'genre.content_films': 'Películas',
                'genre.content_contents': 'Contenidos',
                'genre.content_manhwa': 'Manhwa',
                'genre.content_manhua': 'Manhua',
                'genre.content_all': 'Todos',
                'profile.rating_label': 'Nota',
                'profile.not_rated': 'Sin valorar',
                'common.scroll_bottom': '↓ Abajo',
                'common.scroll_top': '↑ Arriba',
                'common.scroll_bottom_title': 'Bajar al final de la página',
                'common.scroll_top_title': 'Subir al inicio de la página',
                
                // Collection essentielle
                'collection.filter.all': 'Todos',
                'collection.filter.watching': 'Viendo',
                'collection.filter.completed': 'Completado',
                'collection.filter.on_hold': 'En Pausa',
                'collection.filter.dropped': 'Abandonado',
                'collection.filter.plan_to_watch': 'Por Ver',
                'user_profile.tab_anime_manga': 'Anime y Manga',
                'user_profile.tab_collection': 'Colección',
                'user_profile.empty_title': 'Ningún elemento en esta colección',
                'user_profile.empty_text': '¡Empieza a añadir anime y manga a tu colección!',
                'user_profile.user_not_found': 'Usuario no encontrado',
                'user_profile.user_not_found_desc': 'El usuario que buscas no existe.',
                'user_profile.back_home': 'Volver al inicio',
                'user_profile.no_cards': 'Ninguna tarjeta que mostrar.',
                'collection.type.all': 'Todos los tipos',
                'collection.type.anime': 'Anime',
                'collection.type.manga': 'Manga',
                'collection.type.novel': 'Novela',
                'collection.type.doujin': 'Doujin',
                'collection.type.manhwa': 'Manhwa',
                'collection.type.manhua': 'Manhua',
                'collection.type.film': 'Película',
                'collection.label_episodes': 'episodios',
                'collection.label_volumes': 'volúmenes',
                'collection.stats.watching': 'Viendo',
                'collection.stats.completed': 'Completado',
                'collection.stats.on_hold': 'En Pausa',
                'collection.stats.dropped': 'Abandonado',
                'collection.stats.plan_to_watch': 'Por Ver',
                
                // Éléments de la page collection
                'collection.change_status': 'Cambiar Estado',
                'collection.remove_from_list': 'Eliminar de la Lista',
                'collection.status_modal.title': 'Cambiar Estado',
                'collection.status_modal.add_title': 'Agregar a Mi Lista',
                'collection.status.watching': 'Viendo',
                'collection.status.completed': 'Completado',
                'collection.status.on_hold': 'En Pausa',
                'collection.status.dropped': 'Abandonado',
                'collection.status.plan_to_watch': 'Por Ver',
                'collection.status.watching_desc': 'Estás viendo actualmente',
                'collection.status.completed_desc': 'Has completado',
                'collection.status.on_hold_desc': 'Has puesto en pausa',
                'collection.status.dropped_desc': 'Has abandonado',
                'collection.status.plan_to_watch_desc': 'Quieres ver',
                'collection.stopped_at.label': '¿Dónde te detuviste?',
                'collection.stopped_at.episode': 'episodio',
                'collection.stopped_at.chapter': 'capítulo',
                'collection.stopped_at.volume': 'volumen',
                'collection.stopped_at.hint': 'Indica el número de episodio o volumen donde te detuviste',
                'collection.confirm_status': 'Confirmar',
                'collection.empty.title': 'Tu lista está vacía',
                'collection.empty.subtitle': '¡Comienza a agregar manga y anime a tu lista!',
                'collection.empty.cta': 'Descubrir manga',
                'collection.delete.confirm_title': 'Confirmar Eliminación',
                'collection.delete.confirm_message': '¿Estás seguro de que quieres eliminar este elemento de tu lista? Esta acción no se puede deshacer.',
                'collection.delete.cancel': 'Cancelar',
                'collection.delete.confirm': 'Eliminar',
                'collection.pagination.display': 'Mostrando {start}-{end} de {total} elementos',
                'collection.pagination.previous': 'Anterior',
                'collection.pagination.next': 'Siguiente',
                
                // Reportar perfil
                'profile.report': 'Reportar',
                'profile.report.title': 'Reportar este usuario',
                'profile.report.subtitle': '¿Por qué reportas a este usuario?',
                'profile.report.reason.harassment': 'Acoso o comportamiento tóxico',
                'profile.report.reason.spam': 'Spam o publicidad no solicitada',
                'profile.report.reason.inappropriate': 'Contenido ofensivo o inapropiado',
                'profile.report.reason.fake': 'Cuenta que suplanta a otra persona',
                'profile.report.reason.other': 'Otra razón',
                'profile.report.comment.label': 'Detalles (opcional)',
                'profile.report.submit': 'Reportar',
                'profile.report.block': 'Bloquear',
                
                // Paramètres de profil
                'profile.settings.google_auth': 'Autenticación de Google',
                'profile.settings.no_password': 'No se requiere contraseña',
                
                // Filtres de note
                'all_ratings': 'Todas las puntuaciones',
                'min_score_7': 'Puntuación mínima 7',
                'min_score_8': 'Puntuación mínima 8',
                'min_score_9': 'Puntuación mínima 9',
                'min_score_10': 'Puntuación mínima 10',
                
                // Pages de détail (sans préfixes)
                'title': 'Detalles',
                'back_to_catalogue': 'Volver al catálogo',
                'loading': 'Cargando...',
                'no_manga_selected': 'Ningún manga seleccionado. Por favor, vuelve al catálogo.',
                'no_anime_selected': 'Ningún anime seleccionado. Por favor, vuelve al catálogo.',
                'load_error': 'Se produjo un error al cargar los detalles.',
                'no_genre': 'Ningún género especificado',
                'no_theme': 'Ningún tema especificado',
                'no_characters': 'No se encontraron personajes.',
                'type': 'Tipo',
                'your_rating': 'Tu puntuación:',
                'cancel': 'Cancelar',
                'click_to_rate': 'Haz clic en las estrellas para puntuar',
                'potential_rating': 'Puntuación potencial:',
                'synopsis': 'Sinopsis',
                'genres': 'Géneros',
                'general_info': 'Información General',
                'original_title': 'Título original:',
                'english_title': 'Título en inglés:',
                'authors': 'Autor(es):',
                'chapters': 'Capítulos:',
                'volumes': 'Volúmenes:',
                'year': 'Año:',
                'publication_date': 'Fecha de publicación:',
                'popularity': 'Popularidad',
                'rank': 'Rango',
                'members': 'Miembros',
                'favorites': 'Favoritos',
                'episodes': 'Episodios',
                'duration': 'Duración',
                'season': 'Temporada',
                'start_date': 'Fecha de inicio',
                'end_date': 'Fecha de fin:',
                'broadcast': 'Emisión:',
                'source': 'Fuente:',
                'studios': 'Estudios:',
                'votes': 'Votos:',
                'min_score_10': 'Puntuación mínima 10',
                
                // Titres alternatifs (sans préfixe)
                'alternative_titles': 'Títulos Alternativos',
                'japanese_title': 'Título japonés:',
                'french_title': 'Título francés:',
                
                // Page d'accueil
                'home.hero_subtitle': 'Tu destino definitivo para seguir y calificar tus anime y manga favoritos',
                'home.explore': 'Explorar la colección',
                'home.why_choose': '¿Por qué elegir MangaWatch?',
                'home.feature_catalogue_title': 'Catálogo Completo',
                'home.feature_catalogue_desc': 'Accede a una vasta colección de anime y manga, desde clásicos atemporales hasta los últimos lanzamientos.',
                'home.feature_rating_title': 'Calificación Inteligente',
                'home.feature_rating_desc': 'Califica y evalúa tus obras favoritas para ayudar a la comunidad a descubrir joyas.',
                'home.feature_tierlist_title': 'Listas de Niveles Personalizadas',
                'home.feature_tierlist_desc': 'Crea y comparte tus propias clasificaciones de anime y personajes.',
                
                // Auteur du jour
                'home.author_of_week': 'Autor de la semana',
                'home.author_bio': 'Biografía',
                'home.author_works': 'Obras principales',
                'home.author_follow': 'Seguir',
                'home.author_unfollow': 'Dejar de seguir',
                
                // Vote du jour
                'home.vote_title': '¡Vota por el anime que crees que es el mejor hoy!',
                'home.vote_title_manga': '¡Vota por el manga que crees que es el mejor hoy!',
                'home.vote_type_anime': 'Voto del día: Anime',
                'home.vote_type_manga': 'Voto del día: Manga',
                'home.vote_button': 'Votar',
                'home.vote_voted': '✓ Votado',
                'home.vote_already_voted': 'Ya votado',
                'home.vote_votes': 'voto',
                'home.vote_votes_plural': 'votos',
                'home.vote_already_voted_message': '¡Ya has votado hoy! Vuelve mañana para votar de nuevo.',
                
                // Nouveaux membres
                'home.new_members': 'Nuevos miembros',
                
                // Quiz du jour
                'home.quiz_title': 'Quiz del día',
                'home.quiz_validate': 'Validar mi respuesta',
                'home.quiz_correct': '¡Correcto!',
                'home.quiz_incorrect': '¡Incorrecto!',
                'home.quiz_correct_answer': 'La respuesta correcta era:',
                'home.quiz_continue': 'Continuar',
                'home.quiz_select_answer': '¡Por favor selecciona una respuesta!',
                'home.quiz_question_progress': 'Pregunta {current} de {total} • ¡Nueva pregunta mañana!',
                'home.quiz_error': 'No se puede cargar el quiz en este momento.',
                
                // Nouveaux utilisateurs
                'home.new_users': 'Nuevos usuarios',
                'home.new_users_error': 'No se pueden cargar los nuevos usuarios en este momento.',
                'home.new_users_error_retry': 'Por favor, inténtelo de nuevo más tarde.',
                'home.new_users_stat_animes': 'Animes',
                'home.new_users_stat_mangas': 'Mangas',
                'home.new_users_stat_tierlists': 'Listas de niveles',
                'home.new_users_join_days_ago': 'Hace {days} días',
                'home.new_users_join_week_ago': 'Hace 1 semana',
                'home.new_users_join_weeks_ago': 'Hace {weeks} semanas',
                
                // Footer
                'footer.copyright': '©',
                'footer.all_rights_reserved': 'Todos los derechos reservados',
                'footer.made_by': 'Hecho por',
                
                // Ayuda / Tickets
                'help.title': 'Ayuda - Reportar un problema',
                'help.ticket_title': 'Ayuda - Reportar un problema',
                'help.ticket_subject': 'Asunto',
                'help.ticket_message': 'Describe tu problema',
                'help.ticket_send': 'Enviar ticket',
                'help.ticket_cancel': 'Cancelar',
                'help.close': 'Cerrar',
                'help.ticket_success': 'Tu ticket ha sido enviado. Te responderemos si es necesario.',
                'help.ticket_error': 'Ha ocurrido un error. Contacta en mangawatch.off@gmail.com',
                'help.ticket_login': 'Inicia sesión para enviar un ticket o escríbenos a mangawatch.off@gmail.com',
                'help.my_tickets': 'Mis tickets',
                'help.new_ticket': 'Nuevo ticket',
                'help.placeholder_subject': 'Ej: Problema de conexión, error en la página de colección...',
                'help.placeholder_message': 'Describe el problema en detalle...',
                'help.loading': 'Cargando…',
                'help.loading_tickets': 'Cargando tus tickets…',
                'help.login_to_see': 'Inicia sesión para ver y gestionar tus tickets.',
                'help.service_unavailable': 'Servicio no disponible.',
                'help.no_tickets': 'No tienes tickets. Crea uno en la pestaña "Nuevo ticket".',
                'help.closed': 'Cerrado',
                'help.in_progress': 'En curso',
                'help.no_subject': 'Sin asunto',
                'help.back_to_list': 'Volver a la lista',
                'help.your_message': 'Tu mensaje',
                'help.support': 'Soporte',
                'help.you': 'Tú',
                'help.your_reply': 'Tu respuesta',
                'help.send_reply': 'Enviar',
                'help.close_ticket_btn': 'Cerrar ticket',
                'help.conversation_closed': 'Conversación cerrada',
                'help.conversation_closed_desc': 'Este ticket ya no acepta respuestas. Solo puedes consultar el historial arriba.',
                'help.close_ticket_confirm_title': '¿Cerrar este ticket?',
                'help.close_ticket_confirm_desc': 'Una vez cerrado no podrás responder. La conversación quedará solo de lectura.',
                'help.close_ticket_confirm_btn': 'Cerrar ticket',
                'help.ticket_closed_toast': 'Ticket cerrado. La conversación queda solo de lectura.',
                'help.reply_sent': 'Respuesta enviada.',
                'help.reply_to_your_ticket': 'Respuesta a tu ticket',
                'help.reply_error': 'Error al enviar.',
                'help.close_error': 'Error al cerrar.',
                'help.load_error': 'No se pudieron cargar tus tickets. Intenta más tarde.',
                'help.load_error_index': 'Configuración requerida: despliega los índices de Firestore y vuelve a intentar.',
                'help.load_error_permission': 'Acceso denegado. Comprueba que estás conectado con la cuenta de tus tickets.',
                'help.tickets_not_enabled_confirm': 'Los tickets aún no están activados en el servidor. ¿Abrir el correo para contactarnos?',
                'messaging.title': 'Mensajes',
                'messaging.aria_label': 'Mensajes',
                'messaging.loading': 'Cargando mensajes...',
                'messaging.empty': 'Ningún mensaje por ahora',
                'messaging.back': 'Volver',
                'messaging.mark_all_read': 'Marcar todo como leído',
                'messaging.load_error': 'Error al cargar mensajes',
                'messaging.delete_error': 'Error al eliminar el mensaje.',
                'messaging.delete': 'Eliminar',
                'messaging.delete_confirm_title': 'Eliminar mensaje',
                'messaging.delete_confirm_body': '¿Seguro que quieres eliminar este mensaje?',
                'messaging.delete_irreversible': 'Esta acción no se puede deshacer.',
                'messaging.cancel': 'Cancelar',
                'messaging.type.info': 'Información',
                'messaging.type.warning': 'Aviso',
                'messaging.type.ban': 'Baneo',
                'messaging.type.thank': 'Agradecimiento',
                'messaging.type.global': 'Anuncio global',
                
                // Perfil
                'profile.search_placeholder': 'Buscar un manga...',
                'profile.search_manga': 'Manga',
                'profile.search_anime': 'Anime',
                'profile.search_movie': 'Película',
                'profile.search_user': 'Usuario',
                'profile.search_aria': 'Buscar',
                'profile.menu_aria': 'Menú',
                'profile.avatar_alt': 'Avatar del usuario',
                'profile.followers': 'Seguidores',
                'profile.following': 'Suscripciones',
                'profile.subscribe': 'Suscribirse',
                'profile.subscribed': 'Suscrito',
                'profile.add_to_top10': 'Añadir al top 10',
                'profile.top10_choose_slot': 'Elige una posición para "{{title}}" en tu Top 10',
                'profile.top10_slot_empty': 'Vacío',
                'profile.top10_move': 'Mover',
                'profile.top10_remove': 'Quitar',
                'profile.top10_place_hint': 'Haz clic en "..." y luego en el botón para añadir al top 10',
                'profile.top10_no_card_selected': 'Ninguna carta seleccionada. Por favor, inténtalo de nuevo.',
                'profile.top10_must_be_logged_in': 'Debes iniciar sesión para añadir al top 10.',
                'profile.top10_card_no_longer_exists': 'La carta seleccionada ya no existe. Por favor, inténtalo de nuevo.',
                'profile.top10_save_error': 'No se pudo guardar el top 10. Por favor, inténtalo de nuevo.',
                'profile.top10_display_error': 'Error al mostrar la interfaz del top 10.',
                'profile.description_placeholder': 'Escribe tu descripción aquí...',
                'profile.edit_description': 'Editar descripción',
                'profile.certified_account': 'Cuenta verificada',
                'profile.banner_alt': 'Banner del perfil',
                'profile.not_set': 'No indicado',
                'profile.no_description': 'Sin descripción',
                'profile.edit_banner': 'Editar banner',
                'profile.choose_image': 'Elegir imagen',
                'profile.choose_video': 'Elegir vídeo',
                'profile.mute_sound': 'Silenciar',
                'profile.remove_banner': 'Quitar banner',
                'profile.close': 'Cerrar',
                'profile.tab_anime_manga': 'Anime y Manga',
                'profile.tab_settings': 'Ajustes',
                'profile.settings_title': 'Ajustes',
                'profile.preferences': 'Preferencias',
                'profile.profile_photo': 'Foto de perfil',
                'profile.banner_label': 'Banner del perfil',
                'profile.banner_video_volume': 'Volumen del vídeo del banner',
                'profile.modify': 'Editar',
                'profile.theme': 'Tema',
                'profile.theme_dark': 'Oscuro',
                'profile.theme_light': 'Claro',
                'profile.privacy_subscriptions': 'Privacidad de suscripciones',
                'profile.hide_subscriptions': 'Ocultar mis suscripciones a otros usuarios',
                'profile.account_info': 'Información de la cuenta',
                'profile.pseudo': 'Usuario',
                'profile.email': 'Correo electrónico',
                'profile.save': 'Guardar',
                'profile.cancel': 'Cancelar',
                'profile.reveal_email': 'Mostrar correo',
                'profile.edit_email': 'Editar correo',
                'profile.edit_password': 'Cambiar contraseña',
                'profile.new_password': 'Nueva contraseña',
                'profile.confirm_password': 'Confirmar contraseña',
                'profile.language': 'Idioma',
                'profile.edit_language': 'Editar idioma',
                'profile.continent': 'Continente',
                'profile.edit_continent': 'Editar continente',
                'profile.continent_europe': 'Europa',
                'profile.continent_north_america': 'América del Norte',
                'profile.continent_south_america': 'América del Sur',
                'profile.continent_africa': 'África',
                'profile.continent_asia': 'Asia',
                'profile.continent_oceania': 'Oceanía',
                'profile.continent_antarctica': 'Antártida',
                'profile.country': 'País',
                'profile.edit_country': 'Editar país',
                'profile.country_modified_success': '¡País actualizado correctamente!',
                'profile.join_date': 'Fecha de registro',
                'profile.blocked_users': 'Usuarios bloqueados',
                'profile.no_blocked_users': 'Ningún usuario bloqueado',
                'profile.unblock': 'Desbloquear',
                'profile.unblock_user': 'Desbloquear a este usuario',
                'profile.account_actions': 'Acciones de la cuenta',
                'profile.logout': 'Cerrar sesión',
                'profile.tier_list_create': '¡Crea tus primeras tier lists para clasificar tus anime y manga favoritos!',
                'profile.no_followers': 'Ningún seguidor por ahora.',
                'profile.no_following': 'Ninguna suscripción por ahora.',
                'profile.settings.no_password': 'No se requiere contraseña',
                'profile.order_desc': 'Orden descendente',
                'profile.order_asc': 'Orden ascendente',
                'profile.type_all': 'Todos los tipos',
                'profile.followers_modal_title': 'Seguidores',
                'profile.following_modal_title': 'Suscripciones',
                'profile.follows_hidden_followers': 'Este usuario ha elegido ocultar sus seguidores.',
                'profile.follows_hidden_following': 'Este usuario ha elegido ocultar a quién sigue.',
                'profile.unblock_confirm': '¿Seguro que quieres desbloquear a',
                'profile.unblock_confirm_end': '? Podrás ver de nuevo su perfil y contenidos.',
                'profile.privacy_subscriptions_hint': 'Los demás usuarios no podrán ver tus seguidores ni a quién sigues',
                'profile.pseudo_edit_hint_30days': 'Puedes cambiar tu nombre de usuario (una vez cada 30 días)',
                'profile.pseudo_cooldown_days': 'Podrás cambiar tu nombre de usuario en {{n}} día(s)',
                'profile.username_tooltip': 'Puedes cambiar tu nombre de usuario una vez cada 30 días. Mín. 3 caracteres, máx. 20, solo letras, números, guiones y guiones bajos, nombre único.',
                'profile.password_label': 'Contraseña',
                'profile.show_password': 'Mostrar contraseña',
                'profile.hide_password': 'Ocultar contraseña',
                'profile.logout_confirm_title': 'Confirmar cierre de sesión',
                'profile.logout_confirm_message': '¿Estás seguro de que quieres cerrar sesión?',
                'profile.logout_confirm_sub': 'Tendrás que iniciar sesión de nuevo para acceder a tu cuenta.',
                'profile.continent_modified_success': '¡Continente actualizado correctamente!',
                'profile.success': 'Éxito',
                
                // Autenticación y registro
                'auth.thank_you_title': '¡Gracias por unirte a nosotros!',
                'auth.thank_you_description': 'Tu registro nos permite ofrecerte una experiencia personalizada y mantenerte informado de las últimas novedades de manga.',
                'auth.suggestions_personalized': 'Sugerencias personalizadas',
                'auth.tier_lists': 'Listas de niveles',
                'auth.community': 'Comunidad',
                'auth.data_protection': 'Tus datos están protegidos y nunca serán compartidos con terceros.',
                
                // Mensajes de validación del pseudo
                'auth.pseudo_min_length': 'El nombre de usuario debe contener al menos 3 caracteres',
                'auth.pseudo_max_length': 'El nombre de usuario no puede exceder 20 caracteres',
                'auth.pseudo_invalid_chars': 'El nombre de usuario solo puede contener letras, números, guiones y guiones bajos',
                'auth.pseudo_forbidden_words': 'Este nombre de usuario contiene palabras prohibidas',
                'auth.pseudo_variations_forbidden': 'Este nombre de usuario contiene variaciones de palabras prohibidas',
                'auth.pseudo_attached_chars_forbidden': 'Este nombre de usuario contiene caracteres adjuntos prohibidos',
                'auth.pseudo_already_taken': 'Este nombre de usuario ya está tomado',
                'auth.pseudo_available': '¡Nombre de usuario disponible!',
                
                // Mensajes de autenticación
                'auth.login': 'Iniciar sesión',
                'auth.register': 'Registrarse',
                'auth.username': 'Nombre de usuario',
                'auth.email': 'Dirección de correo electrónico',
                'auth.password': 'Contraseña',
                'auth.language': 'Idioma',
                'auth.continent': 'Continente',
                'auth.country': 'País',
                'auth.choose_country': 'Elija su país',
                'auth.age_confirmation': 'Confirmo que tengo más de 18 años',
                'auth.stay_connected': 'Mantener sesión iniciada',
                'auth.accept_terms': 'Acepto los',
                'auth.terms_of_service': 'términos de servicio',
                'auth.privacy_policy': 'política de privacidad',
                'auth.create_account': 'Crear mi cuenta',
                
                // Navegación
                'nav.login': 'Iniciar sesión',
                'nav.register': 'Registrarse',
                
                // Búsqueda
                'search.type.manga': 'Manga',
                'search.type.anime': 'Anime',
                
                // Mensajes generales
                'common.loading_vote_options': 'Cargando opciones de votación...',
                
                // Sección Voto del Día
                'home.vote_of_day': 'Voto del Día',
                'home.vote_description': '¿Qué anime/manga prefieres hoy?',
                'home.vote_results': 'Resultados de la votación',
                'home.vote_new_vote': 'Nuevo voto',
                'home.vote_already_voted_today': '¡Ya has votado hoy!',
                'home.vote_reset_tomorrow': '¡Puedes restablecer la votación mañana!',
                
                // Voto del día (detalles)
                'home.vote_description_template': '¿Qué {type} prefieres hoy?',
                'home.vote_type_badge_anime': 'Voto del día: Anime',
                'home.vote_type_badge_manga': 'Voto del día: Manga',
                'home.vote_button_text': 'Votar',
                'home.vote_count': 'votos',
            },
            it: {
                // Navigation essentielle
                'nav.home': 'Home',
                'nav.manga_anime': 'Manga & Anime',
                'nav.collection': 'Collezione',
                'nav.profile': 'Profilo',
                'nav.tierlist': 'Lista Tier',
                'nav.forum': 'Forum',
                
                // Titres de pages essentiels
                'catalogue.title.manga': 'Manga',
                'catalogue.title.anime': 'Anime',
                'collection.title': 'La Mia Collezione',
                'collection.subtitle': 'Gestisci i tuoi manga e anime preferiti',
                
                // Filtres essentiels
                'type': 'Tipo',
                'status': 'Stato',
                'sort': 'Ordina per',
                'reset': 'Ripristina',
                
                // Options de filtre essentielles
                'manga': 'Manga',
                'anime': 'Anime',
                'novel': 'Romanzo',
                'doujin': 'Doujin',
                'manhwa': 'Manhwa',
                'manhua': 'Manhua',
                'all_status': 'Tutti gli stati',
                'watching': 'Guardando',
                'completed': 'Completato',
                'on_hold': 'In Pausa',
                'dropped': 'Abbandonato',
                'plan_to_watch': 'Da Vedere',
                'score': 'Miglior Punteggio',
                'popularity': 'Più Popolari',
                
                // Types d'anime
                'anime_type': 'Tipo di Anime',
                'all_anime_types': 'Tutti i tipi di anime',
                'tv': 'TV',
                'movie': 'Film',
                'ova': 'OVA',
                'special': 'Speciale',
                'ona': 'ONA',
                'music': 'Video Musicale',
                
                // Autres options
                'rating': 'Punteggio Minimo',
                'relevance': 'Rilevanza',
                'title': 'Ordine Alfabetico',
                'start_date': 'Data di Uscita',
                
                // Pagination
                'pagination.previous': 'Precedente',
                'pagination.next': 'Successivo',
                
                // Modal de statut
                'collection.status_modal.title': 'Scegli uno stato',
                'collection.status.watching': 'Guardando',
                'collection.status.completed': 'Completato',
                'collection.status.on_hold': 'In Pausa',
                'collection.status.dropped': 'Abbandonato',
                'collection.status.plan_to_watch': 'Da Vedere',
                
                // Messages essentiels
                'message.loading': 'Caricamento...',
                'message.error': 'Si è verificato un errore',
                'message.no_results': 'Nessun risultato trovato',
                
                // Barre de recherche
                'search.placeholder': 'Cerca un anime o manga...',
                'search.placeholder.manga': 'Cerca un manga...',
                'search.placeholder.anime': 'Cerca un anime...',
                'search.placeholder.movie': 'Cerca un film...',
                'search.placeholder.manhwa': 'Cerca un manhwa...',
                'search.placeholder.manhua': 'Cerca un manhua...',
                'search.placeholder.user': 'Cerca un utente...',
                'search.placeholder.generic': 'Cerca...',
                'search.aria_label': 'Cerca',
                'search.clear_aria': 'Cancella ricerca',
                
                // Options de recherche
                'search.type.manga': 'Manga',
                'search.type.anime': 'Anime',
                'search.type.movie': 'Film',
                'search.type.manhwa': 'Manhwa',
                'search.type.manhua': 'Manhua',
                'search.type.user': 'Utente',
                'search.results_for': 'Risultati di ricerca per "{query}" ({count})',
                'search.results_for_genre': 'Risultati di ricerca per il genere "{genre}" per "{query}" ({count})',
                'search.no_results_genre': 'Nessun risultato per il genere "{genre}" per "{query}"',
                'search.no_results': 'Nessun risultato per "{query}"',
                'search.result_one': '1 risultato',
                'search.result_many': '{n} risultati',
                'common.pagination_prev': '← Precedente',
                'common.pagination_next': 'Successivo →',
                'genre.of_genre': 'del genere:',
                'genre.type_label': 'Tipo:',
                'genre.content_mangas': 'Manga',
                'genre.content_animes': 'Anime',
                'genre.content_films': 'Film',
                'genre.content_contents': 'Contenuti',
                'genre.content_manhwa': 'Manhwa',
                'genre.content_manhua': 'Manhua',
                'genre.content_all': 'Tutti',
                'profile.rating_label': 'Voto',
                'profile.not_rated': 'Non valutato',
                'common.scroll_bottom': '↓ Giù',
                'common.scroll_top': '↑ Su',
                'common.scroll_bottom_title': 'Scorri in basso',
                'common.scroll_top_title': 'Scorri in alto',
                
                // Collection essentielle
                'collection.filter.all': 'Tutti',
                'collection.filter.watching': 'Guardando',
                'collection.filter.completed': 'Completato',
                'collection.filter.on_hold': 'In Pausa',
                'collection.filter.dropped': 'Abbandonato',
                'collection.filter.plan_to_watch': 'Da Vedere',
                'user_profile.tab_anime_manga': 'Anime e Manga',
                'user_profile.tab_collection': 'Collezione',
                'user_profile.empty_title': 'Nessun elemento in questa collezione',
                'user_profile.empty_text': 'Inizia ad aggiungere anime e manga alla tua collezione!',
                'user_profile.user_not_found': 'Utente non trovato',
                'user_profile.user_not_found_desc': 'L\'utente che cerchi non esiste.',
                'user_profile.back_home': 'Torna alla home',
                'user_profile.no_cards': 'Nessuna scheda da visualizzare.',
                'collection.type.all': 'Tutti i tipi',
                'collection.type.anime': 'Anime',
                'collection.type.manga': 'Manga',
                'collection.type.novel': 'Romanzo',
                'collection.type.doujin': 'Doujin',
                'collection.type.manhwa': 'Manhwa',
                'collection.type.manhua': 'Manhua',
                'collection.type.film': 'Film',
                'collection.label_episodes': 'episodi',
                'collection.label_volumes': 'volumi',
                'collection.stats.watching': 'Guardando',
                'collection.stats.completed': 'Completato',
                'collection.stats.on_hold': 'In Pausa',
                'collection.stats.dropped': 'Abbandonato',
                'collection.stats.plan_to_watch': 'Da Vedere',
                
                // Éléments de la page collection
                'collection.change_status': 'Cambia Stato',
                'collection.remove_from_list': 'Rimuovi dalla Lista',
                'collection.status_modal.title': 'Cambia Stato',
                'collection.status_modal.add_title': 'Aggiungi alla Mia Lista',
                'collection.status.watching': 'Guardando',
                'collection.status.completed': 'Completato',
                'collection.status.on_hold': 'In Pausa',
                'collection.status.dropped': 'Abbandonato',
                'collection.status.plan_to_watch': 'Da Vedere',
                'collection.status.watching_desc': 'Stai guardando attualmente',
                'collection.status.completed_desc': 'Hai completato',
                'collection.status.on_hold_desc': 'Hai messo in pausa',
                'collection.status.dropped_desc': 'Hai abbandonato',
                'collection.status.plan_to_watch_desc': 'Vuoi guardare',
                'collection.stopped_at.label': 'Dove ti sei fermato?',
                'collection.stopped_at.episode': 'episodio',
                'collection.stopped_at.chapter': 'capitolo',
                'collection.stopped_at.volume': 'volume',
                'collection.stopped_at.hint': 'Indica il numero di episodio o volume dove ti sei fermato',
                'collection.confirm_status': 'Conferma',
                'collection.empty.title': 'La tua lista è vuota',
                'collection.empty.subtitle': 'Inizia ad aggiungere manga e anime alla tua lista!',
                'collection.empty.cta': 'Scopri manga',
                'collection.delete.confirm_title': 'Conferma Eliminazione',
                'collection.delete.confirm_message': 'Sei sicuro di voler rimuovere questo elemento dalla tua lista? Questa azione non può essere annullata.',
                'collection.delete.cancel': 'Annulla',
                'collection.delete.confirm': 'Elimina',
                'collection.pagination.display': 'Visualizzazione di {start}-{end} di {total} elementi',
                'collection.pagination.previous': 'Precedente',
                'collection.pagination.next': 'Successivo',
                
                // Segnala profilo
                'profile.report': 'Segnala',
                'profile.report.title': 'Segnala questo utente',
                'profile.report.subtitle': 'Perché stai segnalando questo utente?',
                'profile.report.reason.harassment': 'Molestie o comportamento tossico',
                'profile.report.reason.spam': 'Spam o pubblicità non richiesta',
                'profile.report.reason.inappropriate': 'Contenuti offensivi o inappropriati',
                'profile.report.reason.fake': 'Account che impersona qualcun altro',
                'profile.report.reason.other': 'Altro motivo',
                'profile.report.comment.label': 'Dettagli (opzionale)',
                'profile.report.submit': 'Segnala',
                'profile.report.block': 'Blocca',
                
                // Paramètres de profil
                'profile.settings.google_auth': 'Autenticazione Google',
                'profile.settings.no_password': 'Nessuna password richiesta',
                
                // Filtres de note
                'all_ratings': 'Tutti i punteggi',
                'min_score_7': 'Punteggio minimo 7',
                'min_score_8': 'Punteggio minimo 8',
                'min_score_9': 'Punteggio minimo 9',
                'min_score_10': 'Punteggio minimo 10',
                
                // Pages de détail (sans préfixes)
                'title': 'Dettagli',
                'back_to_catalogue': 'Torna al catalogo',
                'loading': 'Caricamento...',
                'no_manga_selected': 'Nessun manga selezionato. Si prega di tornare al catalogo.',
                'no_anime_selected': 'Nessun anime selezionato. Si prega di tornare al catalogo.',
                'load_error': 'Si è verificato un errore durante il caricamento dei dettagli.',
                'no_genre': 'Nessun genere specificato',
                'no_theme': 'Nessun tema specificato',
                'no_characters': 'Nessun personaggio trovato.',
                'type': 'Tipo',
                'your_rating': 'La tua valutazione:',
                'cancel': 'Annulla',
                'click_to_rate': 'Clicca sulle stelle per valutare',
                'potential_rating': 'Valutazione potenziale:',
                'synopsis': 'Sinossi',
                'genres': 'Generi',
                'general_info': 'Informazioni Generali',
                'original_title': 'Titolo originale:',
                'english_title': 'Titolo inglese:',
                'authors': 'Autore/i:',
                'chapters': 'Capitoli:',
                'volumes': 'Volumi:',
                'year': 'Anno:',
                'publication_date': 'Data di pubblicazione:',
                'popularity': 'Popolarità',
                'rank': 'Classifica',
                'members': 'Membri',
                'favorites': 'Preferiti',
                'episodes': 'Episodi',
                'duration': 'Durata',
                'season': 'Stagione',
                'start_date': 'Data di inizio',
                'end_date': 'Data di fine:',
                'broadcast': 'Trasmissione:',
                'source': 'Fonte:',
                'studios': 'Studi:',
                'votes': 'Voti:',
                'min_score_8': 'Punteggio minimo 8',
                'min_score_9': 'Punteggio minimo 9',
                'min_score_10': 'Punteggio minimo 10',
                
                // Titres alternatifs (sans préfixe)
                'alternative_titles': 'Titoli Alternativi',
                'japanese_title': 'Titolo giapponese:',
                'french_title': 'Titolo francese:',
                
                // Page d'accueil
                'home.hero_subtitle': 'La tua destinazione definitiva per seguire e valutare i tuoi anime e manga preferiti',
                'home.explore': 'Esplora la collezione',
                'home.why_choose': 'Perché scegliere MangaWatch?',
                'home.feature_catalogue_title': 'Catalogo Completo',
                'home.feature_catalogue_desc': 'Accedi a una vasta collezione di anime e manga, dai classici senza tempo alle ultime uscite.',
                'home.feature_rating_title': 'Valutazione Intelligente',
                'home.feature_rating_desc': 'Valuta e giudica le tue opere preferite per aiutare la comunità a scoprire gemme.',
                'home.feature_tierlist_title': 'Liste Tier Personalizzate',
                'home.feature_tierlist_desc': 'Crea e condividi le tue classifiche di anime e personaggi.',
                
                // Auteur du jour
                'home.author_of_week': 'Autore della settimana',
                'home.author_bio': 'Biografia',
                'home.author_works': 'Opere principali',
                'home.author_follow': 'Segui',
                'home.author_unfollow': 'Non seguire più',
                
                // Vote du jour
                'home.vote_title': 'Vota per l\'anime che pensi sia il migliore oggi!',
                'home.vote_title_manga': 'Vota per il manga che pensi sia il migliore oggi!',
                'home.vote_type_anime': 'Voto del giorno: Anime',
                'home.vote_type_manga': 'Voto del giorno: Manga',
                'home.vote_button': 'Vota',
                'home.vote_voted': '✓ Votato',
                'home.vote_already_voted': 'Già votato',
                'home.vote_votes': 'voto',
                'home.vote_votes_plural': 'voti',
                'home.vote_already_voted_message': 'Hai già votato oggi! Torna domani per votare di nuovo.',
                
                // Nouveaux membres
                'home.new_members': 'Nuovi membri',
                
                // Quiz du jour
                'home.quiz_title': 'Quiz del giorno',
                'home.quiz_validate': 'Conferma la mia risposta',
                'home.quiz_correct': 'Corretto!',
                'home.quiz_incorrect': 'Sbagliato!',
                'home.quiz_correct_answer': 'La risposta corretta era:',
                'home.quiz_continue': 'Continua',
                'home.quiz_select_answer': 'Seleziona una risposta!',
                'home.quiz_question_progress': 'Domanda {current} di {total} • Nuova domanda domani!',
                'home.quiz_error': 'Impossibile caricare il quiz al momento.',
                
                // Nouveaux utilisateurs
                'home.new_users': 'Nuovi utenti',
                'home.new_users_error': 'Impossibile caricare i nuovi utenti al momento.',
                'home.new_users_error_retry': 'Riprova più tardi.',
                'home.new_users_stat_animes': 'Anime',
                'home.new_users_stat_mangas': 'Manga',
                'home.new_users_stat_tierlists': 'Tier List',
                'home.new_users_join_days_ago': '{days} giorni fa',
                'home.new_users_join_week_ago': '1 settimana fa',
                'home.new_users_join_weeks_ago': '{weeks} settimane fa',
                
                // Footer
                'footer.copyright': '©',
                'footer.all_rights_reserved': 'Tutti i diritti riservati',
                'footer.made_by': 'Creato da',
                
                // Aiuto / Ticket
                'help.title': 'Aiuto - Segnala un problema',
                'help.ticket_title': 'Aiuto - Segnala un problema',
                'help.ticket_subject': 'Oggetto',
                'help.ticket_message': 'Descrivi il tuo problema',
                'help.ticket_send': 'Invia ticket',
                'help.ticket_cancel': 'Annulla',
                'help.close': 'Chiudi',
                'help.ticket_success': 'Il tuo ticket è stato inviato. Ti risponderemo se necessario.',
                'help.ticket_error': 'Si è verificato un errore. Contattaci a mangawatch.off@gmail.com',
                'help.ticket_login': 'Accedi per inviare un ticket o scrivici a mangawatch.off@gmail.com',
                'help.my_tickets': 'I miei ticket',
                'help.new_ticket': 'Nuovo ticket',
                'help.placeholder_subject': 'Es: Problema di accesso, bug nella pagina collezione...',
                'help.placeholder_message': 'Descrivi il problema in dettaglio...',
                'help.loading': 'Caricamento…',
                'help.loading_tickets': 'Caricamento dei tuoi ticket…',
                'help.login_to_see': 'Accedi per vedere e gestire i tuoi ticket.',
                'help.service_unavailable': 'Servizio non disponibile.',
                'help.no_tickets': 'Non hai ticket. Creane uno dalla scheda "Nuovo ticket".',
                'help.closed': 'Chiuso',
                'help.in_progress': 'In corso',
                'help.no_subject': 'Senza oggetto',
                'help.back_to_list': 'Torna alla lista',
                'help.your_message': 'Il tuo messaggio',
                'help.support': 'Supporto',
                'help.you': 'Tu',
                'help.your_reply': 'La tua risposta',
                'help.send_reply': 'Invia',
                'help.close_ticket_btn': 'Chiudi ticket',
                'help.conversation_closed': 'Conversazione chiusa',
                'help.conversation_closed_desc': 'Questo ticket non accetta più risposte. Puoi solo consultare la cronologia sopra.',
                'help.close_ticket_confirm_title': 'Chiudere questo ticket?',
                'help.close_ticket_confirm_desc': 'Una volta chiuso non potrai più rispondere. La conversazione resterà in sola lettura.',
                'help.close_ticket_confirm_btn': 'Chiudi ticket',
                'help.ticket_closed_toast': 'Ticket chiuso. La conversazione resta in sola lettura.',
                'help.reply_sent': 'Risposta inviata.',
                'help.reply_to_your_ticket': 'Risposta al tuo ticket',
                'help.reply_error': 'Errore nell\'invio.',
                'help.close_error': 'Errore nella chiusura.',
                'help.load_error': 'Impossibile caricare i ticket. Riprova più tardi.',
                'help.load_error_index': 'Configurazione richiesta: distribuisci gli indici Firestore e riprova.',
                'help.load_error_permission': 'Accesso negato. Verifica di essere connesso con l\'account dei tuoi ticket.',
                'help.tickets_not_enabled_confirm': 'I ticket non sono ancora attivi lato server. Aprire il client email per contattarci?',
                'messaging.title': 'Messaggi',
                'messaging.aria_label': 'Messaggi',
                'messaging.loading': 'Caricamento messaggi...',
                'messaging.empty': 'Nessun messaggio al momento',
                'messaging.back': 'Indietro',
                'messaging.mark_all_read': 'Segna tutti come letti',
                'messaging.load_error': 'Errore nel caricamento messaggi',
                'messaging.delete_error': 'Errore nell\'eliminazione del messaggio.',
                'messaging.delete': 'Elimina',
                'messaging.delete_confirm_title': 'Elimina messaggio',
                'messaging.delete_confirm_body': 'Sei sicuro di voler eliminare questo messaggio?',
                'messaging.delete_irreversible': 'Questa azione non può essere annullata.',
                'messaging.cancel': 'Annulla',
                'messaging.type.info': 'Informazione',
                'messaging.type.warning': 'Avviso',
                'messaging.type.ban': 'Bannaggio',
                'messaging.type.thank': 'Ringraziamento',
                'messaging.type.global': 'Annuncio globale',
                
                // Profilo
                'profile.search_placeholder': 'Cerca un manga...',
                'profile.search_manga': 'Manga',
                'profile.search_anime': 'Anime',
                'profile.search_movie': 'Film',
                'profile.search_user': 'Utente',
                'profile.search_aria': 'Cerca',
                'profile.menu_aria': 'Menu',
                'profile.avatar_alt': 'Avatar utente',
                'profile.followers': 'Follower',
                'profile.following': 'Seguiti',
                'profile.subscribe': 'Segui',
                'profile.subscribed': 'Iscritto',
                'profile.add_to_top10': 'Aggiungi ai top 10',
                'profile.top10_choose_slot': 'Scegli una posizione per "{{title}}" nella tua Top 10',
                'profile.top10_slot_empty': 'Vuoto',
                'profile.top10_move': 'Sposta',
                'profile.top10_remove': 'Rimuovi',
                'profile.top10_place_hint': 'Clicca su "..." e poi sul pulsante per aggiungere alla top 10',
                'profile.top10_no_card_selected': 'Nessuna scheda selezionata. Riprova.',
                'profile.top10_must_be_logged_in': 'Devi effettuare l\'accesso per aggiungere alla top 10.',
                'profile.top10_card_no_longer_exists': 'La scheda selezionata non esiste più. Riprova.',
                'profile.top10_save_error': 'Impossibile salvare la top 10. Riprova.',
                'profile.top10_display_error': 'Errore nella visualizzazione dell\'interfaccia top 10.',
                'profile.description_placeholder': 'Scrivi la tua descrizione qui...',
                'profile.edit_description': 'Modifica descrizione',
                'profile.certified_account': 'Account verificato',
                'profile.banner_alt': 'Banner del profilo',
                'profile.not_set': 'Non indicato',
                'profile.no_description': 'Nessuna descrizione',
                'profile.edit_banner': 'Modifica banner',
                'profile.choose_image': 'Scegli immagine',
                'profile.choose_video': 'Scegli video',
                'profile.mute_sound': 'Disattiva audio',
                'profile.remove_banner': 'Rimuovi banner',
                'profile.close': 'Chiudi',
                'profile.tab_anime_manga': 'Anime e Manga',
                'profile.tab_settings': 'Impostazioni',
                'profile.settings_title': 'Impostazioni',
                'profile.preferences': 'Preferenze',
                'profile.profile_photo': 'Foto profilo',
                'profile.banner_label': 'Banner del profilo',
                'profile.banner_video_volume': 'Volume video banner',
                'profile.modify': 'Modifica',
                'profile.theme': 'Tema',
                'profile.theme_dark': 'Scuro',
                'profile.theme_light': 'Chiaro',
                'profile.privacy_subscriptions': 'Privacy abbonamenti',
                'profile.hide_subscriptions': 'Nascondi i miei abbonamenti agli altri',
                'profile.account_info': 'Informazioni account',
                'profile.pseudo': 'Nome utente',
                'profile.email': 'Email',
                'profile.save': 'Salva',
                'profile.cancel': 'Annulla',
                'profile.reveal_email': 'Mostra email',
                'profile.edit_email': 'Modifica email',
                'profile.edit_password': 'Modifica password',
                'profile.new_password': 'Nuova password',
                'profile.confirm_password': 'Conferma password',
                'profile.language': 'Lingua',
                'profile.edit_language': 'Modifica lingua',
                'profile.continent': 'Continente',
                'profile.edit_continent': 'Modifica continente',
                'profile.continent_europe': 'Europa',
                'profile.continent_north_america': 'America del Nord',
                'profile.continent_south_america': 'America del Sud',
                'profile.continent_africa': 'Africa',
                'profile.continent_asia': 'Asia',
                'profile.continent_oceania': 'Oceania',
                'profile.continent_antarctica': 'Antartide',
                'profile.country': 'Paese',
                'profile.edit_country': 'Modifica paese',
                'profile.country_modified_success': 'Paese aggiornato con successo!',
                'profile.join_date': 'Data di iscrizione',
                'profile.blocked_users': 'Utenti bloccati',
                'profile.no_blocked_users': 'Nessun utente bloccato',
                'profile.unblock': 'Sblocca',
                'profile.unblock_user': 'Sblocca questo utente',
                'profile.account_actions': 'Azioni account',
                'profile.logout': 'Esci',
                'profile.tier_list_create': 'Crea le tue prime tier list per classificare i tuoi anime e manga preferiti!',
                'profile.no_followers': 'Nessun follower per ora.',
                'profile.no_following': 'Nessun seguito per ora.',
                'profile.settings.no_password': 'Nessuna password richiesta',
                'profile.order_desc': 'Ordine decrescente',
                'profile.order_asc': 'Ordine crescente',
                'profile.type_all': 'Tutti i tipi',
                'profile.followers_modal_title': 'Follower',
                'profile.following_modal_title': 'Seguiti',
                'profile.follows_hidden_followers': 'Questo utente ha scelto di nascondere i suoi follower.',
                'profile.follows_hidden_following': 'Questo utente ha scelto di nascondere chi segue.',
                'profile.unblock_confirm': 'Vuoi davvero sbloccare',
                'profile.unblock_confirm_end': '? Potrai di nuovo vedere il suo profilo e i contenuti.',
                'profile.privacy_subscriptions_hint': 'Gli altri utenti non potranno vedere i tuoi follower e i tuoi abbonamenti',
                'profile.pseudo_edit_hint_30days': 'Puoi modificare il tuo nome utente (una volta ogni 30 giorni)',
                'profile.pseudo_cooldown_days': 'Potrai modificare il tuo nome utente tra {{n}} giorno/i',
                'profile.username_tooltip': 'Puoi modificare il tuo nome utente una volta ogni 30 giorni. Min 3 caratteri, max 20, solo lettere, numeri, trattini e underscore, nome univoco.',
                'profile.password_label': 'Password',
                'profile.show_password': 'Mostra password',
                'profile.hide_password': 'Nascondi password',
                'profile.logout_confirm_title': 'Conferma disconnessione',
                'profile.logout_confirm_message': 'Sei sicuro di volerti disconnettere?',
                'profile.logout_confirm_sub': 'Dovrai effettuare di nuovo l\'accesso per accedere al tuo account.',
                'profile.continent_modified_success': 'Continente modificato con successo!',
                'profile.success': 'Successo',
                
                // Autenticazione e registrazione
                'auth.thank_you_title': 'Grazie per esserti unito a noi!',
                'auth.thank_you_description': 'La tua registrazione ci permette di offrirti un\'esperienza personalizzata e di tenerti informato sulle ultime novità manga.',
                'auth.suggestions_personalized': 'Suggerimenti personalizzati',
                'auth.tier_lists': 'Liste tier',
                'auth.community': 'Comunità',
                'auth.data_protection': 'I tuoi dati sono protetti e non saranno mai condivisi con terzi.',
                
                // Messaggi di validazione del nome utente
                'auth.pseudo_min_length': 'Il nome utente deve contenere almeno 3 caratteri',
                'auth.pseudo_max_length': 'Il nome utente non può superare i 20 caratteri',
                'auth.pseudo_invalid_chars': 'Il nome utente può contenere solo lettere, numeri, trattini e underscore',
                'auth.pseudo_forbidden_words': 'Questo nome utente contiene parole vietate',
                'auth.pseudo_variations_forbidden': 'Questo nome utente contiene variazioni di parole vietate',
                'auth.pseudo_attached_chars_forbidden': 'Questo nome utente contiene caratteri allegati vietati',
                'auth.pseudo_already_taken': 'Questo nome utente è già occupato',
                'auth.pseudo_available': 'Nome utente disponibile!',
                
                // Messaggi di autenticazione
                'auth.login': 'Accedi',
                'auth.register': 'Registrati',
                'auth.username': 'Nome utente',
                'auth.email': 'Indirizzo email',
                'auth.password': 'Password',
                'auth.language': 'Lingua',
                'auth.continent': 'Continente',
                'auth.country': 'Paese',
                'auth.choose_country': 'Scegli il tuo paese',
                'auth.age_confirmation': 'Confermo di avere più di 18 anni',
                'auth.stay_connected': 'Rimani connesso',
                'auth.accept_terms': 'Accetto i',
                'auth.terms_of_service': 'termini di servizio',
                'auth.privacy_policy': 'politica sulla privacy',
                'auth.create_account': 'Crea il mio account',
                
                // Navigazione
                'nav.login': 'Accedi',
                'nav.register': 'Registrati',
                
                // Ricerca
                'search.type.manga': 'Manga',
                'search.type.anime': 'Anime',
                
                // Messaggi generali
                'common.loading_vote_options': 'Caricamento opzioni di voto...',
                
                // Sezione Voto del Giorno
                'home.vote_of_day': 'Voto del Giorno',
                'home.vote_description': 'Quale anime/manga preferisci oggi?',
                'home.vote_results': 'Risultati del voto',
                'home.vote_new_vote': 'Nuovo voto',
                'home.vote_already_voted_today': 'Hai già votato oggi!',
                'home.vote_reset_tomorrow': 'Puoi resettare il voto domani!',
                
                // Voto del giorno (dettagli)
                'home.vote_description_template': 'Quale {type} preferisci oggi?',
                'home.vote_type_badge_anime': 'Voto del giorno: Anime',
                'home.vote_type_badge_manga': 'Voto del giorno: Manga',
                'home.vote_button_text': 'Vota',
                'home.vote_count': 'voti',
            },
            ja: {
                // Navigation essentielle
                'nav.home': 'ホーム',
                'nav.manga_anime': 'マンガ & アニメ',
                'nav.collection': 'コレクション',
                'nav.profile': 'プロフィール',
                'nav.tierlist': 'ティアリスト',
                'nav.forum': 'フォーラム',
                
                // Titres de pages essentiels
                'catalogue.title.manga': 'マンガ',
                'catalogue.title.anime': 'アニメ',
                'collection.title': 'マイコレクション',
                'collection.subtitle': 'お気に入りのマンガとアニメを管理',
                
                // Filtres essentiels
                'type': 'タイプ',
                'status': 'ステータス',
                'sort': '並び替え',
                'reset': 'リセット',
                
                // Options de filtre essentielles
                'manga': 'マンガ',
                'anime': 'アニメ',
                'novel': '小説',
                'doujin': '同人誌',
                'manhwa': 'マンファ',
                'manhua': 'マンファ',
                'all_status': 'すべてのステータス',
                'watching': '視聴中',
                'completed': '完了',
                'on_hold': '保留',
                'dropped': 'ドロップ',
                'plan_to_watch': '見たい',
                'score': '最高評価',
                'popularity': '人気順',
                'genre_sort': 'ジャンルで並べ替え',
                'no_synopsis_available': 'あらすじなし',
                
                // Types d'anime
                'anime_type': 'アニメタイプ',
                'all_anime_types': 'すべてのアニメタイプ',
                'tv': 'TV',
                'movie': '映画',
                'ova': 'OVA',
                'special': 'スペシャル',
                'ona': 'ONA',
                'music': 'ミュージックビデオ',
                
                // Autres options
                'rating': '最低評価',
                'relevance': '関連性',
                'title': 'アルファベット順',
                'start_date': 'リリース日',
                
                // Pagination
                'pagination.previous': '前へ',
                'pagination.next': '次へ',
                
                // Modal de statut
                'collection.status_modal.title': 'ステータスを選択',
                'collection.status.watching': '視聴中',
                'collection.status.completed': '完了',
                'collection.status.on_hold': '保留',
                'collection.status.dropped': 'ドロップ',
                'collection.status.plan_to_watch': '見たい',
                
                // Messages essentiels
                'message.loading': '読み込み中...',
                'message.error': 'エラーが発生しました',
                'message.no_results': '結果が見つかりません',
                
                // Barre de recherche
                'search.placeholder': 'アニメやマンガを検索...',
                
                // Collection essentielle
                'collection.filter.all': 'すべて',
                'collection.filter.watching': '視聴中',
                'collection.filter.completed': '完了',
                'collection.filter.on_hold': '保留',
                'collection.filter.dropped': 'ドロップ',
                'collection.filter.plan_to_watch': '見たい',
                'user_profile.tab_anime_manga': 'アニメ＆マンガ',
                'user_profile.tab_collection': 'コレクション',
                'user_profile.empty_title': 'このコレクションにアイテムがありません',
                'user_profile.empty_text': 'アニメやマンガをコレクションに追加しましょう！',
                'user_profile.user_not_found': 'ユーザーが見つかりません',
                'user_profile.user_not_found_desc': 'お探しのユーザーは存在しません。',
                'user_profile.back_home': 'ホームに戻る',
                'user_profile.no_cards': '表示するカードがありません。',
                'collection.type.all': 'すべてのタイプ',
                'collection.type.anime': 'アニメ',
                'collection.type.manga': 'マンガ',
                'collection.type.novel': '小説',
                'collection.type.doujin': '同人誌',
                'collection.type.manhwa': 'マンファ',
                'collection.type.manhua': 'マンファ',
                'collection.type.film': '映画',
                'collection.label_episodes': '話',
                'collection.label_volumes': '巻',
                'collection.stats.watching': '視聴中',
                'collection.stats.completed': '完了',
                'collection.stats.on_hold': '保留',
                'collection.stats.dropped': 'ドロップ',
                'collection.stats.plan_to_watch': '見たい',
                
                // Éléments de la page collection
                'collection.change_status': 'ステータス変更',
                'collection.remove_from_list': 'リストから削除',
                'collection.status_modal.title': 'ステータス変更',
                'collection.status_modal.add_title': 'マイリストに追加',
                'collection.status.watching': '視聴中',
                'collection.status.completed': '完了',
                'collection.status.on_hold': '保留',
                'collection.status.dropped': 'ドロップ',
                'collection.status.plan_to_watch': '見たい',
                'collection.status.watching_desc': '現在視聴中',
                'collection.status.completed_desc': '完了済み',
                'collection.status.on_hold_desc': '保留中',
                'collection.status.dropped_desc': 'ドロップ済み',
                'collection.status.plan_to_watch_desc': '見たい',
                'collection.stopped_at.label': 'どこで止めましたか？',
                'collection.stopped_at.episode': '話',
                'collection.stopped_at.chapter': '章',
                'collection.stopped_at.volume': '巻',
                'collection.stopped_at.hint': '停止したエピソードまたは巻の番号を入力してください',
                'collection.confirm_status': '確認',
                'collection.empty.title': 'リストが空です',
                'collection.empty.subtitle': 'マンガやアニメをリストに追加しましょう！',
                'collection.empty.cta': 'マンガを発見',
                'collection.delete.confirm_title': '削除確認',
                'collection.delete.confirm_message': 'このアイテムをリストから削除してもよろしいですか？この操作は取り消せません。',
                'collection.delete.cancel': 'キャンセル',
                'collection.delete.confirm': '削除',
                'collection.pagination.display': '{start}-{end} / {total} アイテムを表示',
                'collection.pagination.previous': '前へ',
                'collection.pagination.next': '次へ',
                
                // プロフィール報告
                'profile.report': '報告',
                'profile.report.title': 'このユーザーを報告',
                'profile.report.subtitle': 'このユーザーを報告する理由は？',
                'profile.report.reason.harassment': '嫌がらせや有害な行動',
                'profile.report.reason.spam': 'スパムや迷惑な広告',
                'profile.report.reason.inappropriate': '不快または不適切なコンテンツ',
                'profile.report.reason.fake': '他人になりすましているアカウント',
                'profile.report.reason.other': 'その他の理由',
                'profile.report.comment.label': '詳細（任意）',
                'profile.report.submit': '報告',
                'profile.report.block': 'ブロック',
                
                // Paramètres de profil
                'profile.settings.google_auth': 'Google認証',
                'profile.settings.no_password': 'パスワード不要',
                
                // Filtres de note
                'all_ratings': 'すべての評価',
                'min_score_7': '最低評価 7',
                'min_score_8': '最低評価 8',
                'min_score_9': '最低評価 9',
                'min_score_10': '最低評価 10',
                
                // Pages de détail (sans préfixes)
                'title': '詳細',
                'back_to_catalogue': 'カタログに戻る',
                'loading': '読み込み中...',
                'no_manga_selected': 'マンガが選択されていません。カタログに戻ってください。',
                'no_anime_selected': 'アニメが選択されていません。カタログに戻ってください。',
                'load_error': '詳細の読み込み中にエラーが発生しました。',
                'no_genre': 'ジャンルが指定されていません',
                'no_theme': 'テーマが指定されていません',
                'no_characters': 'キャラクターが見つかりません。',
                'type': 'タイプ',
                'your_rating': 'あなたの評価:',
                'cancel': 'キャンセル',
                'click_to_rate': '星をクリックして評価してください',
                'potential_rating': '潜在的な評価:',
                'synopsis': 'あらすじ',
                'genres': 'ジャンル',
                'general_info': '一般情報',
                'original_title': '原題:',
                'english_title': '英語タイトル:',
                'authors': '作者:',
                'chapters': '章:',
                'volumes': '巻:',
                'year': '年:',
                'publication_date': '出版日:',
                'popularity': '人気',
                'rank': 'ランク',
                'members': 'メンバー',
                'favorites': 'お気に入り',
                'episodes': 'エピソード',
                'duration': '時間',
                'season': 'シーズン',
                'start_date': '開始日',
                'end_date': '終了日:',
                'broadcast': '放送:',
                'source': '原作:',
                'studios': 'スタジオ:',
                'votes': '投票:',
                'min_score_9': '最低評価 9',
                'min_score_10': '最低評価 10',
                
                // Titres alternatifs (sans préfixe)
                'alternative_titles': '代替タイトル',
                'japanese_title': '日本語タイトル:',
                'french_title': 'フランス語タイトル:',
                
                // Page d'accueil
                'home.hero_subtitle': 'お気に入りのアニメとマンガを追跡・評価するための究極の目的地',
                'home.explore': 'コレクションを探索',
                'home.why_choose': 'なぜMangaWatchを選ぶのか？',
                'home.feature_catalogue_title': '完全なカタログ',
                'home.feature_catalogue_desc': '時代を超えたクラシックから最新リリースまで、アニメとマンガの膨大なコレクションにアクセス。',
                'home.feature_rating_title': 'スマート評価',
                'home.feature_rating_desc': 'お気に入りの作品を評価し、コミュニティが宝石を発見するのを助けます。',
                'home.feature_tierlist_title': 'カスタムティアリスト',
                'home.feature_tierlist_desc': '独自のアニメとキャラクターのランキングを作成・共有。',
                
                // Auteur du jour
                'home.author_of_week': '今週の作者',
                'home.author_bio': '経歴',
                'home.author_works': '主要作品',
                'home.author_follow': 'フォロー',
                'home.author_unfollow': 'フォロー解除',
                
                // Vote du jour
                'home.vote_title': '今日最高だと思うアニメに投票しよう！',
                'home.vote_title_manga': '今日最高だと思うマンガに投票しよう！',
                'home.vote_type_anime': '今日の投票: アニメ',
                'home.vote_type_manga': '今日の投票: マンガ',
                'home.vote_button': '投票',
                'home.vote_voted': '✓ 投票済み',
                'home.vote_already_voted': '既に投票済み',
                'home.vote_votes': '票',
                'home.vote_votes_plural': '票',
                'home.vote_already_voted_message': '今日は既に投票済みです！明日また投票してください。',
                
                // Nouveaux membres
                'home.new_members': '新メンバー',
                
                // Nouveaux utilisateurs
                'home.new_users': '新規ユーザー',
                'home.new_users_error': '新しいユーザーを読み込めませんでした。',
                'home.new_users_error_retry': '後でもう一度お試しください。',
                'home.new_users_stat_animes': 'アニメ',
                'home.new_users_stat_mangas': '漫画',
                'home.new_users_stat_tierlists': 'ティアリスト',
                'home.new_users_join_days_ago': '{days}日前',
                'home.new_users_join_week_ago': '1週間前',
                'home.new_users_join_weeks_ago': '{weeks}週間前',
                
                // Popup d'authentification
                'home.welcome_title': 'MangaWatchへようこそ！',
                'home.welcome_login': 'ログイン',
                'home.welcome_register': '登録',
                
                // Recherche
                'search.placeholder.manga': 'マンガを検索...',
                'search.placeholder.anime': 'アニメを検索...',
                'search.placeholder.movie': '映画を検索...',
                'search.placeholder.manhwa': 'マンファを検索...',
                'search.placeholder.manhua': 'マンファを検索...',
                'search.placeholder.user': 'ユーザーを検索...',
                'search.placeholder.generic': '検索...',
                'search.aria_label': '検索',
                'search.clear_aria': '検索をクリア',
                
                // Options de recherche
                'search.type.manga': 'マンガ',
                'search.type.anime': 'アニメ',
                'search.type.movie': '映画',
                'search.type.manhwa': 'マンファ',
                'search.type.manhua': 'マンファ',
                'search.type.user': 'ユーザー',
                'search.results_for': '「{query}」の検索結果（{count}）',
                'search.results_for_genre': 'ジャンル「{genre}」の「{query}」の検索結果（{count}）',
                'search.no_results_genre': 'ジャンル「{genre}」の「{query}」に該当なし',
                'search.no_results': '「{query}」に該当なし',
                'search.result_one': '1件',
                'search.result_many': '{n}件',
                'common.pagination_prev': '← 前へ',
                'common.pagination_next': '次へ →',
                'genre.of_genre': 'ジャンル：',
                'genre.type_label': 'タイプ：',
                'genre.content_mangas': 'マンガ',
                'genre.content_animes': 'アニメ',
                'genre.content_films': '映画',
                'genre.content_contents': 'コンテンツ',
                'genre.content_manhwa': 'マンファ',
                'genre.content_manhua': 'マンファ',
                'genre.content_all': 'すべて',
                'profile.rating_label': '評価',
                'profile.not_rated': '未評価',
                'common.scroll_bottom': '↓ 下へ',
                'common.scroll_top': '↑ 上へ',
                'common.scroll_bottom_title': 'ページの下へ',
                'common.scroll_top_title': 'ページの上へ',
                
                // Messages généraux
                'common.loading': '読み込み中...',
                'common.loading_vote_options': '投票オプションを読み込んでいます...',
                'common.message': 'メッセージ',
                'common.message_content': 'メッセージ内容',
                'common.understood': '了解',
                'common.avatar_user': 'ユーザーアバター',
                'common.description_unavailable': '説明が利用できません。',
                'common.image_unavailable': '画像が利用できません',
                'common.avatar_unavailable': 'アバターが利用できません',
                'common.image_not_loaded': '画像が読み込まれていません',
                'common.poster_of': 'ポスター',
                'common.avatar_of': 'アバター',
                
                // Vote du jour (détails)
                'home.vote_description_template': '今日はどの{type}がお好みですか？',
                'home.vote_type_badge_anime': '今日の投票: アニメ',
                'home.vote_type_badge_manga': '今日の投票: マンガ',
                'home.vote_button_text': '投票',
                'home.vote_count': '票',
                'home.vote_already_done_title': '投票済み',
                'home.vote_already_done_message': '今日は既に投票済みです！明日また投票できます。',
                'home.vote_new_votes_notification': '新しい票！',
                'home.logout_title': '👋 ログアウト',
                'home.logout_message': '正常にログアウトしました',
                
                // Section Vote du Jour
                'home.vote_of_day': '今日の投票',
                'home.vote_description': '今日はどのアニメ/マンガがお好みですか？',
                'home.vote_results': '投票結果',
                'home.vote_new_vote': '新しい投票',
                'home.vote_already_voted_today': '今日は既に投票済みです！',
                'home.vote_reset_tomorrow': '明日投票をリセットできます！',
                
                // Auteur de la semaine (détails)
                'home.author_featured': '注目:',
                'home.author_major_works': '主要作品',
                
                // Quiz du jour
                'home.quiz_title': '今日のクイズ',
                'home.quiz_validate': '答えを確認',
                'home.quiz_correct': '正解！',
                'home.quiz_incorrect': '不正解！',
                'home.quiz_correct_answer': '正解は:',
                'home.quiz_continue': '続行',
                'home.quiz_select_answer': '答えを選択してください！',
                'home.quiz_question_progress': '問題 {current} / {total} • 明日新しい問題！',
                'home.quiz_error': '現在クイズを読み込めません。',
                
                // Footer
                'footer.copyright': '©',
                'footer.all_rights_reserved': '全著作権所有',
                'footer.made_by': '作成者',
                
                // ヘルプ / チケット
                'help.title': 'ヘルプ - 問題を報告',
                'help.ticket_title': 'ヘルプ - 問題を報告',
                'help.ticket_subject': '件名',
                'help.ticket_message': '問題を説明してください',
                'help.ticket_send': 'チケットを送信',
                'help.ticket_cancel': 'キャンセル',
                'help.close': '閉じる',
                'help.ticket_success': 'チケットを送信しました。必要に応じてご連絡します。',
                'help.ticket_error': 'エラーが発生しました。mangawatch.off@gmail.com までご連絡ください。',
                'help.ticket_login': 'チケットを送信するにはログインするか、mangawatch.off@gmail.com にメールしてください。',
                'help.my_tickets': 'マイチケット',
                'help.new_ticket': '新規チケット',
                'help.placeholder_subject': '例：ログインの問題、コレクションページのバグ...',
                'help.placeholder_message': '問題を詳しく説明してください...',
                'help.loading': '読み込み中…',
                'help.loading_tickets': 'チケットを読み込み中…',
                'help.login_to_see': 'ログインしてチケットの表示・管理をしてください。',
                'help.service_unavailable': 'サービス利用不可。',
                'help.no_tickets': 'チケットはありません。「新規チケット」タブで作成してください。',
                'help.closed': '終了',
                'help.in_progress': '対応中',
                'help.no_subject': '件名なし',
                'help.back_to_list': '一覧に戻る',
                'help.your_message': 'あなたのメッセージ',
                'help.support': 'サポート',
                'help.you': 'あなた',
                'help.your_reply': '返信',
                'help.send_reply': '送信',
                'help.close_ticket_btn': 'チケットを閉じる',
                'help.conversation_closed': '会話終了',
                'help.conversation_closed_desc': 'このチケットは返信を受け付けていません。上の履歴のみ閲覧できます。',
                'help.close_ticket_confirm_title': 'このチケットを閉じますか？',
                'help.close_ticket_confirm_desc': '閉じると返信できません。会話は閲覧のみ可能です。',
                'help.close_ticket_confirm_btn': 'チケットを閉じる',
                'help.ticket_closed_toast': 'チケットを閉じました。会話は閲覧のみ可能です。',
                'help.reply_sent': '返信を送信しました。',
                'help.reply_to_your_ticket': 'チケットへの返信',
                'help.reply_error': '送信エラー。',
                'help.close_error': '閉じる際にエラー。',
                'help.load_error': 'チケットを読み込めません。後でもう一度お試しください。',
                'help.load_error_index': '設定が必要です。Firestore インデックスをデプロイしてから再試行してください。',
                'help.load_error_permission': 'アクセス拒否。チケットのアカウントでログインしているか確認してください。',
                'help.tickets_not_enabled_confirm': 'チケットはサーバー側でまだ有効になっていません。メールでお問い合わせしますか？',
                'messaging.title': 'メッセージ',
                'messaging.aria_label': 'メッセージ',
                'messaging.loading': 'メッセージを読み込み中...',
                'messaging.empty': 'メッセージはありません',
                'messaging.back': '戻る',
                'messaging.mark_all_read': 'すべて既読にする',
                'messaging.load_error': 'メッセージの読み込みエラー',
                'messaging.delete_error': 'メッセージの削除に失敗しました。',
                'messaging.delete': '削除',
                'messaging.delete_confirm_title': 'メッセージを削除',
                'messaging.delete_confirm_body': 'このメッセージを削除しますか？',
                'messaging.delete_irreversible': 'この操作は取り消せません。',
                'messaging.cancel': 'キャンセル',
                'messaging.type.info': 'お知らせ',
                'messaging.type.warning': '警告',
                'messaging.type.ban': 'BAN',
                'messaging.type.thank': '感謝',
                'messaging.type.global': '全体告知',
                
                // プロフィール
                'profile.search_placeholder': 'マンガを検索...',
                'profile.search_manga': 'マンガ',
                'profile.search_anime': 'アニメ',
                'profile.search_movie': '映画',
                'profile.search_user': 'ユーザー',
                'profile.search_aria': '検索',
                'profile.menu_aria': 'メニュー',
                'profile.avatar_alt': 'ユーザーアバター',
                'profile.followers': 'フォロワー',
                'profile.following': 'フォロー中',
                'profile.subscribe': 'フォロー',
                'profile.subscribed': 'フォロー中',
                'profile.add_to_top10': 'トップ10に追加',
                'profile.top10_choose_slot': '「{{title}}」をトップ10の配置に選んでください',
                'profile.top10_slot_empty': '空',
                'profile.top10_move': '移動',
                'profile.top10_remove': '削除',
                'profile.top10_place_hint': '「...」をクリックしてからボタンでトップ10に追加',
                'profile.top10_no_card_selected': 'カードが選択されていません。もう一度お試しください。',
                'profile.top10_must_be_logged_in': 'トップ10に追加するにはログインが必要です。',
                'profile.top10_card_no_longer_exists': '選択したカードは存在しません。もう一度お試しください。',
                'profile.top10_save_error': 'トップ10を保存できませんでした。もう一度お試しください。',
                'profile.top10_display_error': 'トップ10インターフェースの表示中にエラーが発生しました。',
                'profile.description_placeholder': '説明をここに書いてください...',
                'profile.edit_description': '説明を編集',
                'profile.certified_account': '認証済みアカウント',
                'profile.banner_alt': 'プロフィールバナー',
                'profile.not_set': '未設定',
                'profile.no_description': '説明なし',
                'profile.edit_banner': 'バナーを編集',
                'profile.choose_image': '画像を選択',
                'profile.choose_video': '動画を選択',
                'profile.mute_sound': 'ミュート',
                'profile.remove_banner': 'バナーを削除',
                'profile.close': '閉じる',
                'profile.tab_anime_manga': 'アニメ＆マンガ',
                'profile.tab_settings': '設定',
                'profile.settings_title': '設定',
                'profile.preferences': 'プリファレンス',
                'profile.profile_photo': 'プロフィール写真',
                'profile.banner_label': 'プロフィールバナー',
                'profile.banner_video_volume': 'バナー動画の音量',
                'profile.modify': '編集',
                'profile.theme': 'テーマ',
                'profile.theme_dark': 'ダーク',
                'profile.theme_light': 'ライト',
                'profile.privacy_subscriptions': 'フォローの非公開',
                'profile.hide_subscriptions': 'フォローを他のユーザーに非表示',
                'profile.account_info': 'アカウント情報',
                'profile.pseudo': 'ユーザー名',
                'profile.email': 'メールアドレス',
                'profile.save': '保存',
                'profile.cancel': 'キャンセル',
                'profile.reveal_email': 'メールを表示',
                'profile.edit_email': 'メールを編集',
                'profile.edit_password': 'パスワードを変更',
                'profile.new_password': '新しいパスワード',
                'profile.confirm_password': 'パスワードを確認',
                'profile.language': '言語',
                'profile.edit_language': '言語を編集',
                'profile.continent': '大陸',
                'profile.edit_continent': '大陸を編集',
                'profile.continent_europe': 'ヨーロッパ',
                'profile.continent_north_america': '北アメリカ',
                'profile.continent_south_america': '南アメリカ',
                'profile.continent_africa': 'アフリカ',
                'profile.continent_asia': 'アジア',
                'profile.continent_oceania': 'オセアニア',
                'profile.continent_antarctica': '南極',
                'profile.country': '国',
                'profile.edit_country': '国を編集',
                'profile.country_modified_success': '国を正常に更新しました。',
                'profile.join_date': '登録日',
                'profile.blocked_users': 'ブロックしたユーザー',
                'profile.no_blocked_users': 'ブロックしたユーザーはいません',
                'profile.unblock': 'ブロック解除',
                'profile.unblock_user': 'このユーザーのブロックを解除',
                'profile.account_actions': 'アカウント操作',
                'profile.logout': 'ログアウト',
                'profile.tier_list_create': 'お気に入りのアニメ・マンガをランク付けする最初のティアリストを作成しましょう！',
                'profile.no_followers': 'フォロワーはいません。',
                'profile.no_following': 'フォロー中はいません。',
                'profile.settings.no_password': 'パスワード不要',
                'profile.order_desc': '降順',
                'profile.order_asc': '昇順',
                'profile.type_all': 'すべてのタイプ',
                'profile.followers_modal_title': 'フォロワー',
                'profile.following_modal_title': 'フォロー中',
                'profile.follows_hidden_followers': 'このユーザーはフォロワーを非表示にしています。',
                'profile.follows_hidden_following': 'このユーザーはフォロー中を非表示にしています。',
                'profile.unblock_confirm': '本当にブロックを解除しますか：',
                'profile.unblock_confirm_end': '？ プロフィールとコンテンツが再表示されます。',
                'profile.privacy_subscriptions_hint': '他のユーザーはあなたのフォロワーとフォローを閲覧できません',
                'profile.pseudo_edit_hint_30days': 'ユーザー名は30日に1回変更できます',
                'profile.pseudo_cooldown_days': '{{n}}日後にユーザー名を変更できます',
                'profile.username_tooltip': 'ユーザー名は30日に1回変更可能。3〜20文字、英数字・ハイフン・アンダースコアのみ、重複不可。',
                'profile.password_label': 'パスワード',
                'profile.show_password': 'パスワードを表示',
                'profile.hide_password': 'パスワードを隠す',
                'profile.logout_confirm_title': 'ログアウトの確認',
                'profile.logout_confirm_message': 'ログアウトしてもよろしいですか？',
                'profile.logout_confirm_sub': 'アカウントに再度アクセスするにはログインが必要です。',
                'profile.continent_modified_success': '地域を正常に更新しました。',
                'profile.success': '成功',
                
                // 認証と登録
                'auth.thank_you_title': 'ご参加ありがとうございます！',
                'auth.thank_you_description': 'ご登録により、パーソナライズされた体験を提供し、最新のマンガ情報をお届けできます。',
                'auth.suggestions_personalized': 'パーソナライズされた提案',
                'auth.tier_lists': 'ティアリスト',
                'auth.community': 'コミュニティ',
                'auth.data_protection': 'あなたのデータは保護されており、第三者と共有されることはありません。',
                
                // ユーザー名検証メッセージ
                'auth.pseudo_min_length': 'ユーザー名は3文字以上である必要があります',
                'auth.pseudo_max_length': 'ユーザー名は20文字を超えることはできません',
                'auth.pseudo_invalid_chars': 'ユーザー名には文字、数字、ハイフン、アンダースコアのみ使用できます',
                'auth.pseudo_forbidden_words': 'このユーザー名には禁止された単語が含まれています',
                'auth.pseudo_variations_forbidden': 'このユーザー名には禁止された単語のバリエーションが含まれています',
                'auth.pseudo_attached_chars_forbidden': 'このユーザー名には禁止された付着文字が含まれています',
                'auth.pseudo_already_taken': 'このユーザー名は既に使用されています',
                'auth.pseudo_available': 'ユーザー名が利用可能です！',
                
                // 認証メッセージ
                'auth.login': 'ログイン',
                'auth.register': '登録',
                'auth.username': 'ユーザー名',
                'auth.email': 'メールアドレス',
                'auth.password': 'パスワード',
                'auth.language': '言語',
                'auth.continent': '大陸',
                'auth.country': '国',
                'auth.choose_country': '国を選択',
                'auth.age_confirmation': '18歳以上であることを確認します',
                'auth.stay_connected': 'ログイン状態を維持',
                'auth.accept_terms': '私は以下を受け入れます',
                'auth.terms_of_service': '利用規約',
                'auth.privacy_policy': 'プライバシーポリシー',
                'auth.create_account': 'アカウントを作成',
                
                // ナビゲーション
                'nav.login': 'ログイン',
                'nav.register': '登録',
            }
        };
        
        this.init();
    }
    
    init() {
        console.log('🚀 Initialisation du système de localisation...');
        // Vérifier si la langue a été changée dans le profil et mettre à jour
        const savedLanguage = localStorage.getItem('mangaWatchLanguage');
        if (savedLanguage && savedLanguage !== this.currentLanguage) {
            console.log(`🔄 Langue détectée dans localStorage: ${savedLanguage}, mise à jour...`);
            this.currentLanguage = savedLanguage;
        }
        
        // Appliquer les classes de langue si nécessaire
        if (document.body) {
            // Supprimer toutes les classes de langue d'abord
            document.body.classList.remove('lang-ja', 'lang-de', 'lang-en', 'lang-es', 'lang-it', 'lang-fr');
            
            if (this.currentLanguage === 'ja') {
                document.body.classList.add('lang-ja');
                document.documentElement.setAttribute('lang', 'ja');
            } else if (this.currentLanguage === 'de') {
                document.body.classList.add('lang-de');
                document.documentElement.setAttribute('lang', 'de');
            } else {
                document.documentElement.setAttribute('lang', this.currentLanguage);
            }
        }
        
        this.applyLanguage();
        console.log('✅ Système de localisation initialisé');
    }
    
    // Obtenir la traduction pour une clé
    get(key) {
        let lang = this.currentLanguage;
        if (!this.translations[lang] && lang && lang.length >= 2) {
            lang = lang.substring(0, 2).toLowerCase();
        }
        const translation = this.translations[lang] && this.translations[lang][key];
        if (!translation) {
            console.warn(`⚠️ Traduction manquante pour la clé "${key}" en langue "${this.currentLanguage}"`);
            const frenchTranslation = this.translations['fr'] && this.translations['fr'][key];
            return frenchTranslation || key;
        }
        return translation;
    }
    
    // Changer de langue
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('mangaWatchLanguage', lang);
            
            // Ajouter/supprimer les classes de langue sur le body pour le CSS
            // Supprimer toutes les classes de langue d'abord
            document.body.classList.remove('lang-ja', 'lang-de', 'lang-en', 'lang-es', 'lang-it', 'lang-fr');
            
            if (lang === 'ja') {
                document.body.classList.add('lang-ja');
                document.documentElement.setAttribute('lang', 'ja');
            } else if (lang === 'de') {
                document.body.classList.add('lang-de');
                document.documentElement.setAttribute('lang', 'de');
            } else {
                document.documentElement.setAttribute('lang', lang);
            }
            
            this.applyLanguage();
            this.updateLanguageSelector();
            
            // Mettre à jour les traductions des genres si la fonction existe
            if (window.updateGenreTranslations) {
                window.updateGenreTranslations();
            }
            
            // Déclencher l'événement de changement de langue
            document.dispatchEvent(new Event('languageChanged'));
        }
    }
    
    // Appliquer la langue à tous les éléments
    applyLanguage() {
        // Uniquement la langue choisie dans l'app (mangaWatchLanguage), pas user.language
        let savedLang = localStorage.getItem('mangaWatchLanguage');
        if (savedLang) {
            savedLang = savedLang.toString().toLowerCase();
            if (savedLang.length > 2) savedLang = savedLang.substring(0, 2);
            if (this.translations[savedLang]) this.currentLanguage = savedLang;
        }
        if (!this.translations[this.currentLanguage]) this.currentLanguage = 'fr';
        console.log(`🔄 Application de la langue: ${this.currentLanguage}`);
        
        // Appliquer les traductions de base (navigation, etc.) - TOUJOURS
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.get(key);
            if (translation && translation !== key) {
                element.textContent = translation;
                console.log(`✅ Traduit "${key}" -> "${translation}"`);
            }
        });
        
        // Appliquer les traductions de placeholder - TOUJOURS
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.get(key);
            if (translation && translation !== key) {
                element.placeholder = translation;
                console.log(`✅ Traduit placeholder "${key}" -> "${translation}"`);
            }
        });
        
        // Appliquer les traductions d'attributs aria-label
        const ariaLabelElements = document.querySelectorAll('[data-i18n-aria-label]');
        ariaLabelElements.forEach(element => {
            const key = element.getAttribute('data-i18n-aria-label');
            const translation = this.get(key);
            if (translation && translation !== key) {
                element.setAttribute('aria-label', translation);
                console.log(`✅ Traduit aria-label "${key}" -> "${translation}"`);
            }
        });
        
        // Appliquer les traductions d'attributs alt
        const altElements = document.querySelectorAll('[data-i18n-alt]');
        altElements.forEach(element => {
            const key = element.getAttribute('data-i18n-alt');
            const translation = this.get(key);
            if (translation && translation !== key) {
                element.setAttribute('alt', translation);
                console.log(`✅ Traduit alt "${key}" -> "${translation}"`);
            }
        });
        
        // Appliquer les traductions d'attribut title
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const translation = this.get(key);
            if (translation && translation !== key) {
                element.setAttribute('title', translation);
            }
        });
        
        // Traduire le contenu dynamique (synopsis, genres, types) - TOUJOURS
        console.log('🔄 Activation de la traduction du contenu dynamique...');
        setTimeout(() => {
            translateEntireSiteAutomatically();
        }, 50);
        
        // Mettre à jour le sélecteur de langue
        this.updateLanguageSelector();
        
        // Déclencher l'événement pour que les autres scripts puissent mettre à jour leurs traductions
        document.dispatchEvent(new CustomEvent('translationsApplied', { 
            detail: { language: this.currentLanguage } 
        }));
        
        console.log('✅ Langue appliquée avec succès');
    }
    
    // Créer le sélecteur de langue (pour les paramètres)
    createLanguageSelector(container) {
        if (!container) return;
        
        // Vérifier si le sélecteur existe déjà
        if (container.querySelector('#language-selector')) return;
        
        const languageSelector = document.createElement('div');
        languageSelector.className = 'language-selector';
        languageSelector.id = 'language-selector';
        
        const select = document.createElement('select');
        select.id = 'language-select';
        
        const languages = [
            { code: 'fr', name: 'Français' },
            { code: 'en', name: 'English' },
            { code: 'de', name: 'Deutsch' },
            { code: 'es', name: 'Español' },
            { code: 'it', name: 'Italiano' },
            { code: 'ja', name: '日本語' }
        ];
        
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            if (lang.code === this.currentLanguage) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
        });
        
        languageSelector.appendChild(select);
        container.appendChild(languageSelector);
    }
    
    // Mettre à jour le sélecteur de langue
    updateLanguageSelector() {
        const select = document.getElementById('language-select');
        if (select) {
            select.value = this.currentLanguage;
        }
    }
}

// Initialiser la localisation
const localization = new Localization();
window.localization = localization;

// Fonction globale pour obtenir une traduction
function t(key) {
    return localization.get(key);
}
// Exposer la fonction t() globalement pour qu'elle soit accessible partout
window.t = t;

// Locale pour les dates (mois traduit selon la langue)
function getDateLocale() {
    var lang = (localStorage.getItem('mangaWatchLanguage') || (localization && localization.currentLanguage) || 'fr').toString().toLowerCase().substring(0, 2);
    var map = { fr: 'fr-FR', en: 'en-US', de: 'de-DE', es: 'es-ES', it: 'it-IT', ja: 'ja-JP' };
    return map[lang] || 'fr-FR';
}
window.getDateLocale = getDateLocale;

// Fonction globale pour changer de langue
function changeLanguage(lang) {
    localization.setLanguage(lang);
}

// Cache pour les traductions
const translationCache = new Map();
const performanceMetrics = {
    translationTime: 0,
    apiCalls: 0,
    cacheHits: 0
};

// Fonction pour diviser un long texte en segments pour la traduction
function splitTextForTranslation(text, maxLength = 4500) {
    // Si le texte est assez court, le retourner tel quel
    if (text.length <= maxLength) {
        return [text];
    }
    
    const segments = [];
    let currentIndex = 0;
    
    while (currentIndex < text.length) {
        const remainingText = text.substring(currentIndex);
        
        // Si le texte restant est plus court que maxLength, prendre tout
        if (remainingText.length <= maxLength) {
            segments.push(remainingText);
            break;
        }
        
        // Chercher un point de coupure optimal (point, point d'exclamation, point d'interrogation suivi d'un espace)
        const segment = remainingText.substring(0, maxLength);
        const lastSentenceEnd = Math.max(
            segment.lastIndexOf('. '),
            segment.lastIndexOf('! '),
            segment.lastIndexOf('? '),
            segment.lastIndexOf('.\n'),
            segment.lastIndexOf('!\n'),
            segment.lastIndexOf('?\n')
        );
        
        // Si on trouve une fin de phrase, couper là
        if (lastSentenceEnd > maxLength * 0.5) {
            // Prendre jusqu'à la fin de phrase + 1 caractère (le point et l'espace)
            const cutPoint = lastSentenceEnd + 2;
            segments.push(remainingText.substring(0, cutPoint));
            currentIndex += cutPoint;
        } else {
            // Sinon, chercher un espace ou un retour à la ligne
            const lastSpace = segment.lastIndexOf(' ');
            const lastNewline = segment.lastIndexOf('\n');
            const cutPoint = Math.max(lastSpace, lastNewline);
            
            if (cutPoint > maxLength * 0.5) {
                segments.push(remainingText.substring(0, cutPoint + 1));
                currentIndex += cutPoint + 1;
            } else {
                // Dernier recours : couper à maxLength
                segments.push(segment);
                currentIndex += maxLength;
            }
        }
    }
    
    return segments;
}

// Fonction optimisée pour traduire avec cache
async function translateWithCache(text, targetLanguage) {
    if (!text || text.trim() === '') return text;
    // Laisser Google Translate détecter automatiquement la langue source
    // Cela permet de traduire du français vers l'anglais quand nécessaire
    // (par exemple pour les descriptions d'auteurs et questions de quiz en français)
    
    const key = `${text}_${targetLanguage}`;
    if (translationCache.has(key)) {
        performanceMetrics.cacheHits++;
        return translationCache.get(key);
    }
    
    try {
        const startTime = performance.now();
        
        // Pour les longs textes (synopsis), diviser en segments
        const segments = splitTextForTranslation(text);
        
        if (segments.length > 1) {
            console.log(`🌐 Traduction de texte long (${text.length} caractères) en ${segments.length} segments vers ${targetLanguage}`);
            
            // Traduire chaque segment
            const translatedSegments = [];
            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                console.log(`📝 Traduction du segment ${i + 1}/${segments.length} (${segment.length} caractères)...`);
                
                try {
                    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(segment)}`);
                    
                    if (!response.ok) {
                        console.warn(`❌ Erreur HTTP pour le segment ${i + 1}: ${response.status}`);
                        translatedSegments.push(segment); // Garder l'original en cas d'erreur
                        continue;
                    }
                    
                    const data = await response.json();
                    const translation = data[0]?.map(item => item[0]).filter(Boolean).join('') || segment;
                    
                    if (translation && translation.trim() !== '') {
                        translatedSegments.push(translation);
                        console.log(`✅ Segment ${i + 1}/${segments.length} traduit`);
                    } else {
                        translatedSegments.push(segment);
                        console.warn(`⚠️ Segment ${i + 1} non traduit, gardé original`);
                    }
                } catch (error) {
                    console.error(`❌ Erreur lors de la traduction du segment ${i + 1}:`, error);
                    translatedSegments.push(segment); // Garder l'original en cas d'erreur
                }
                
                // Petite pause entre les requêtes pour éviter de surcharger l'API
                if (i < segments.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            // Réassembler les segments traduits
            const fullTranslation = translatedSegments.join(' ');
            
            if (fullTranslation && fullTranslation.trim() !== '' && fullTranslation !== text) {
                translationCache.set(key, fullTranslation);
                performanceMetrics.apiCalls += segments.length;
                performanceMetrics.translationTime += performance.now() - startTime;
                console.log(`✅ Texte long traduit avec succès (${fullTranslation.length} caractères)`);
                return fullTranslation;
            } else {
                console.warn(`⚠️ Traduction complète invalide, gardé texte original`);
                return text;
            }
        } else {
            // Texte court, traduction normale
            console.log(`🌐 Appel API de traduction: "${text.substring(0, 30)}..." vers ${targetLanguage}`);
            
            // Utiliser 'auto' pour détecter automatiquement la langue source
            const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`);
            
            if (!response.ok) {
                console.warn(`❌ Erreur HTTP lors de la traduction automatique: ${response.status}`);
                return text;
            }
            
            const data = await response.json();
            const translation = data[0]?.map(item => item[0]).filter(Boolean).join('') || text;
            
            console.log(`📝 Réponse API: "${translation.substring(0, 50)}..."`);
            
            // Vérifier que la traduction est valide
            if (translation && translation.trim() !== '' && translation !== text) {
                translationCache.set(key, translation);
                performanceMetrics.apiCalls++;
                performanceMetrics.translationTime += performance.now() - startTime;
                console.log(`✅ Traduction mise en cache: "${text.substring(0, 30)}..." → "${translation.substring(0, 30)}..."`);
                return translation;
            } else {
                console.warn(`⚠️ Traduction invalide ou vide pour "${text.substring(0, 30)}...", gardé texte original`);
                return text;
            }
        }
    } catch (error) {
        console.error(`❌ Erreur lors de la traduction automatique pour "${text.substring(0, 30)}...":`, error);
        return text;
    }
}
// Exposer la fonction globalement pour qu'elle soit accessible partout
window.translateWithCache = translateWithCache;

// Traduction par lots (batch)
async function translateBatch(texts, targetLanguage) {
    if (!texts || texts.length === 0) return [];
    // Laisser Google Translate détecter automatiquement la langue source
    // Cela permet de traduire du français vers l'anglais quand nécessaire
    
    // Filtrer les textes qui sont déjà dans la langue cible
    const textsToTranslate = [];
    const textIndices = [];
    
    for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        // Vérifier si le texte est déjà dans la langue cible
        const isAlreadyInTargetLang = 
            (targetLanguage === 'ja' && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) ||
            (targetLanguage === 'zh' && /[\u4E00-\u9FAF]/.test(text)) ||
            (targetLanguage === 'ko' && /[\uAC00-\uD7AF]/.test(text)) ||
            (targetLanguage === 'ar' && /[\u0600-\u06FF]/.test(text));
        
        if (!isAlreadyInTargetLang && text && text.trim() !== '') {
            textsToTranslate.push(text);
            textIndices.push(i);
        }
    }
    
    // Si tous les textes sont déjà traduits, retourner les originaux
    if (textsToTranslate.length === 0) {
        return texts;
    }
    
    const batchSize = 10; // Limite Google Translate
    const results = [...texts]; // Commencer avec les textes originaux
    
    for (let i = 0; i < textsToTranslate.length; i += batchSize) {
        const batch = textsToTranslate.slice(i, i + batchSize);
        const batchIndices = textIndices.slice(i, i + batchSize);
        const batchText = batch.join('\n');
        
        try {
            const startTime = performance.now();
            // Utiliser 'auto' pour détecter automatiquement la langue source
            const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(batchText)}`);
            
            if (!response.ok) {
                console.warn('Erreur lors de la traduction par lots:', response.status);
                continue; // Garder les textes originaux déjà dans results
            }
            
            const data = await response.json();
            const translation = data[0]?.map(item => item[0]).join('') || batchText;
            const translatedTexts = translation.split('\n');
            
            // Mettre à jour seulement les textes traduits
            for (let j = 0; j < batch.length; j++) {
                const originalText = batch[j];
                const translatedText = translatedTexts[j] || originalText;
                const resultIndex = batchIndices[j];
                
                // Vérifier que la traduction est valide
                if (translatedText && translatedText.trim() !== '' && translatedText !== originalText) {
                    results[resultIndex] = translatedText;
                }
                // Sinon, garder le texte original (déjà dans results)
            }
            
            performanceMetrics.apiCalls++;
            performanceMetrics.translationTime += performance.now() - startTime;
            
        } catch (error) {
            console.warn('Erreur lors de la traduction par lots:', error);
            // Garder les textes originaux déjà dans results
        }
    }
    
    return results;
}

// Fonction pour déterminer si un texte doit être traduit
function shouldTranslate(text, targetLanguage) {
    if (!text || text.trim() === '') return false;
    if (text.length < 3) return false;
    
    // Ne pas traduire les URLs, emails, etc.
    if (/^(https?:\/\/|www\.|[\w\.-]+@[\w\.-]+\.\w+)$/.test(text)) return false;
    
    // Ne pas traduire les types de contenu spécifiques
    const contentTypes = ['Anime', 'Manga', 'Roman', 'Doujin', 'Manhwa', 'Manhua', 'Film', 'Novel', 'romain'];
    if (contentTypes.includes(text)) return false;
    
    // Ne pas traduire les textes qui sont déjà des codes ou des identifiants
    // Mais permettre la traduction des types de contenu courants
    if (/^[A-Z0-9_]+$/.test(text)) {
        // Liste des valeurs qui DOIVENT être traduites malgré le pattern
        const translatableValues = [
            'TV', 'OVA', 'ONA', 'MOVIE', 'SPECIAL', 'MUSIC',
            'MANGA', 'NOVEL', 'LIGHT NOVEL', 'VISUAL NOVEL', 'DOUJIN',
            'MANHWA', 'MANHUA', 'ONE SHOT', 'DOUJINSHI'
        ];
        
        // Si c'est dans la liste des valeurs traduisibles, permettre la traduction
        if (translatableValues.includes(text.toUpperCase())) {
            return true;
        }
        
        return false;
    }
    
    return true;
}

// Fonction optimisée pour traduire le contenu dynamique
async function translateDynamicContent() {
    const currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
    if (currentLanguage === 'en') return;
    
    console.log('🔄 Démarrage de translateDynamicContent...');
    const startTime = performance.now();
    
    // Traduire chaque type d'élément séparément pour éviter les conflits
    await translateTitles(currentLanguage);
    await translateSynopses(currentLanguage);
    await translateGenres(currentLanguage);
    
    performanceMetrics.translationTime += performance.now() - startTime;
    logPerformance();
    console.log('✅ translateDynamicContent terminé');
}

// Fonction pour traduire les titres
async function translateTitles(targetLanguage) {
    const titleElements = document.querySelectorAll('.details-title, .content-title, .anime-title, .manga-title');
    console.log(`📚 Traduction de ${titleElements.length} titres`);
    
    // D'abord, essayer d'utiliser la logique d'affichage des titres selon la langue
    updateTitleDisplay(targetLanguage);
    
    // Ensuite, traduire les indicateurs de saison/partie
    await translateSeasonIndicators(targetLanguage);
    
    // PAS DE TRADUCTION AUTOMATIQUE DES TITRES - SEULEMENT LES INDICATEURS DE SAISON/PARTIE
    console.log('✅ Titres affichés sans traduction automatique (titre original conservé)');
}

// Fonction pour traduire les synopses
async function translateSynopses(targetLanguage) {
    const synopsisElements = document.querySelectorAll('.synopsis-text, .content-synopsis, .anime-synopsis, .manga-synopsis, .profile-card-synopsis');
    console.log(`📝 Traduction de ${synopsisElements.length} synopses`);
    
    const textsToTranslate = [];
    const elementsToUpdate = [];
    const originalTexts = []; // Garder les textes originaux
    
    synopsisElements.forEach(element => {
        // Ignorer les éléments avec data-no-i18n
        if (element.hasAttribute('data-no-i18n')) {
            return;
        }
        const originalText = element.textContent.trim();
        if (originalText && shouldTranslate(originalText, targetLanguage)) {
            textsToTranslate.push(originalText);
            elementsToUpdate.push(element);
            originalTexts.push(originalText); // Sauvegarder le texte original
        }
    });
    
    if (textsToTranslate.length > 0) {
        try {
            if (textsToTranslate.length > 3) {
                const translatedTexts = await translateBatch(textsToTranslate, targetLanguage);
                elementsToUpdate.forEach((element, index) => {
                    const translatedText = translatedTexts[index];
                    // Vérifier que la traduction est valide
                    if (translatedText && translatedText.trim() !== '' && translatedText !== originalTexts[index]) {
                        console.log(`📝 Synopsis traduit: "${originalTexts[index].substring(0, 50)}..." → "${translatedText.substring(0, 50)}..."`);
                        element.textContent = translatedText;
                    } else {
                        console.log(`⚠️ Traduction invalide pour le synopsis ${index + 1}, gardé original`);
                    }
                });
            } else {
                for (let i = 0; i < elementsToUpdate.length; i++) {
                    const translatedText = await translateWithCache(textsToTranslate[i], targetLanguage);
                    // Vérifier que la traduction est valide
                    if (translatedText && translatedText.trim() !== '' && translatedText !== originalTexts[i]) {
                        console.log(`📝 Synopsis traduit: "${originalTexts[i].substring(0, 50)}..." → "${translatedText.substring(0, 50)}..."`);
                        elementsToUpdate[i].textContent = translatedText;
                    } else {
                        console.log(`⚠️ Traduction invalide pour le synopsis ${i + 1}, gardé original`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Erreur lors de la traduction des synopses:', error);
            // En cas d'erreur, garder les textes originaux
        }
    }
}

// Fonction pour traduire les genres
async function translateGenres(targetLanguage) {
    const genreElements = document.querySelectorAll('.genre-tag, .type-badge');
    console.log(`🏷️ Traduction de ${genreElements.length} genres et types`);
    
    if (genreElements.length === 0) {
        console.log('⚠️ Aucun élément genre ou type trouvé');
        return;
    }
    
    // Ne pas traduire les types de contenu spécifiques
    const contentTypes = ['Anime', 'Manga', 'Roman', 'Doujin', 'Manhwa', 'Manhua', 'Film', 'Novel'];
    const typeElements = document.querySelectorAll('[data-i18n*="collection.type."]');
    typeElements.forEach(element => {
        const text = element.textContent.trim();
        if (contentTypes.includes(text)) {
            console.log(`🚫 Type de contenu non traduit: ${text}`);
            return;
        }
    });
    
    const textsToTranslate = [];
    const elementsToUpdate = [];
    
    genreElements.forEach((element, index) => {
        // Ignorer les éléments avec data-no-i18n
        if (element.hasAttribute('data-no-i18n')) {
            return;
        }
    
        const originalText = element.textContent.trim();
        const elementClass = element.className;
    
        // Vérifications spécifiques pour les genres et types
        if (originalText && shouldTranslate(originalText, targetLanguage)) {
            // Fonction pour vérifier si c'est un genre valide (pas un titre d'épisode)
            function isValidGenreText(text) {
                if (!text || typeof text !== 'string') return false;
                const genreText = text.trim();
                const genreTextLower = genreText.toLowerCase();
                
                // Exclure les textes qui commencent par # suivi d'un numéro
                if (/^\s*#\d+/.test(genreText)) {
                    return false;
                }
                
                // Exclure les textes contenant "Episode" ou "Épisode" suivi d'un numéro
                if (/(episode|épisode)\s*\d+/i.test(genreText)) {
                    return false;
                }
                
                // Exclure les textes contenant des parenthèses avec des numéros
                if (/\([^)]*\d+[^)]*\)/.test(genreText)) {
                    return false;
                }
                
                // Exclure les textes contenant ":" (suggère un titre d'épisode)
                if (/:\s/.test(genreText)) {
                    return false;
                }
                
                // Exclure les textes contenant "!" ou "?" (suggère un titre)
                if (/[!?]/.test(genreText)) {
                    return false;
                }
                
                // Exclure les textes avec trop de caractères spéciaux
                const specialCharCount = (genreText.match(/[#:()[\]{}'",;!?]/g) || []).length;
                if (specialCharCount > 1) {
                    return false;
                }
                
                // Exclure les textes qui ressemblent à des phrases (trop de mots)
                const words = genreTextLower.split(/\s+/);
                if (words.length > 5) {
                    return false;
                }
                
                // Vérifier que c'est bien un genre ou type (texte court, pas de ponctuation excessive)
                if (genreText.length >= 50 || genreText.includes('.')) {
                    return false;
                }
                
                // Exclure les textes contenant des mots spécifiques suggérant un titre
                if (/oppai|motomemasu|minorimasu/i.test(genreText)) {
                    return false;
                }
                
                return true;
            }
            
            // Vérifier que c'est bien un genre ou type valide
            if (isValidGenreText(originalText)) {
                console.log(`Genre/Type ${index + 1}: "${originalText}" (classe: ${elementClass})`);
                textsToTranslate.push(originalText);
                elementsToUpdate.push(element);
            } else {
                console.warn(`⚠️ Genre/Type invalide filtré: "${originalText}" - ignoré (ressemble à un titre d'épisode)`);
            }
        } else {
            console.log(`Genre/Type "${originalText}" ignoré par shouldTranslate`);
        }
    });
    
    console.log(`🎯 ${textsToTranslate.length} genres/types à traduire`);
    
    if (textsToTranslate.length > 0) {
        try {
            if (textsToTranslate.length > 3) {
                const translatedTexts = await translateBatch(textsToTranslate, targetLanguage);
                elementsToUpdate.forEach((element, index) => {
                    if (translatedTexts[index]) {
                        console.log(`Traduction: "${textsToTranslate[index]}" -> "${translatedTexts[index]}"`);
                        element.textContent = translatedTexts[index];
                    }
                });
            } else {
                for (let i = 0; i < elementsToUpdate.length; i++) {
                    const translatedText = await translateWithCache(textsToTranslate[i], targetLanguage);
                    console.log(`Traduction: "${textsToTranslate[i]}" -> "${translatedText}"`);
                    elementsToUpdate[i].textContent = translatedText;
                }
            }
        } catch (error) {
            console.error('❌ Erreur lors de la traduction des genres:', error);
        }
    }
}

// Fonction pour traduire tout le contenu du site
async function translateEntireSite() {
    const currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
    if (currentLanguage === 'en') return;
    
    console.log('Traduction automatique du site en cours...');
    
    // 1. Traduire les éléments avec data-i18n (déjà fait par applyStaticTranslations)
    applyStaticTranslations(currentLanguage);
    
    // 2. Traduire le contenu dynamique
    await translateDynamicContent();
    
    // 3. Traduire les éléments supplémentaires
    await translateAdditionalElements(currentLanguage);
    
    
    console.log('Traduction terminée !');
}

// Fonction pour traduire des éléments supplémentaires
async function translateAdditionalElements(targetLanguage) {
    // Traduire les placeholders
    const placeholders = document.querySelectorAll('input[placeholder], textarea[placeholder]');
    for (const element of placeholders) {
        // Ignorer les éléments avec data-no-i18n
        if (element.hasAttribute('data-no-i18n')) {
            continue;
        }
        if (shouldTranslate(element.placeholder, targetLanguage)) {
            element.placeholder = await translateWithCache(element.placeholder, targetLanguage);
        }
    }
    
    // Traduire les titres (title attributes)
    const titleElements = document.querySelectorAll('[title]');
    for (const element of titleElements) {
        // Ignorer les éléments avec data-no-i18n
        if (element.hasAttribute('data-no-i18n')) {
            continue;
        }
        if (shouldTranslate(element.title, targetLanguage)) {
            element.title = await translateWithCache(element.title, targetLanguage);
        }
    }
    
    // Traduire les alt text des images
    const images = document.querySelectorAll('img[alt]');
    for (const element of images) {
        // Ignorer les éléments avec data-no-i18n
        if (element.hasAttribute('data-no-i18n')) {
            continue;
        }
        if (shouldTranslate(element.alt, targetLanguage)) {
            element.alt = await translateWithCache(element.alt, targetLanguage);
        }
    }
}

// Fonction pour afficher les performances
function logPerformance() {
    console.log(`=== Métriques de Traduction ===`);
    console.log(`Temps total: ${performanceMetrics.translationTime.toFixed(2)}ms`);
    console.log(`Appels API: ${performanceMetrics.apiCalls}`);
    console.log(`Cache hits: ${performanceMetrics.cacheHits}`);
    console.log(`Taux de cache: ${((performanceMetrics.cacheHits / (performanceMetrics.apiCalls + performanceMetrics.cacheHits)) * 100).toFixed(1)}%`);
}

// Fonction pour charger progressivement avec traduction
function displayContentWithProgressiveTranslation(contentList) {
    // 1. Traduire progressivement le contenu existant
    setTimeout(() => {
        translateVisibleContent();
    }, 100);
    
    setTimeout(() => {
        translateRemainingContent();
    }, 1000);
}

// Traduire seulement le contenu visible
async function translateVisibleContent() {
    const currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
    if (currentLanguage === 'en') return;
    
    const visibleElements = document.querySelectorAll('.content-title, .content-synopsis, .genre-tag, .type-badge');
    const visibleTexts = [];
    const visibleElementsArray = [];
    
    visibleElements.forEach(element => {
        if (isElementInViewport(element) && shouldTranslate(element.textContent, currentLanguage)) {
            visibleTexts.push(element.textContent);
            visibleElementsArray.push(element);
        }
    });
    
    if (visibleTexts.length > 0) {
        const translatedTexts = await translateBatch(visibleTexts, currentLanguage);
        visibleElementsArray.forEach((element, index) => {
            if (translatedTexts[index]) {
                element.textContent = translatedTexts[index];
            }
        });
    }
}

// Traduire le contenu restant
async function translateRemainingContent() {
    const currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
    if (currentLanguage === 'en') return;
    
    const allElements = document.querySelectorAll('.content-title, .content-synopsis, .genre-tag, .type-badge');
    const remainingTexts = [];
    const remainingElements = [];
    
    allElements.forEach(element => {
        // Ignorer les éléments avec data-no-i18n
        if (element.hasAttribute('data-no-i18n')) {
            return;
        }
        if (!isElementInViewport(element) && shouldTranslate(element.textContent, currentLanguage)) {
            remainingTexts.push(element.textContent);
            remainingElements.push(element);
        }
    });
    
    if (remainingTexts.length > 0) {
        const translatedTexts = await translateBatch(remainingTexts, currentLanguage);
        remainingElements.forEach((element, index) => {
            if (translatedTexts[index]) {
                element.textContent = translatedTexts[index];
            }
        });
    }
}

// Vérifier si un élément est visible
function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Fonction pour précharger les traductions
function preloadTranslations() {
    const currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
    
    // Traduire les éléments visibles d'abord
    translateVisibleContent();
    
    // Puis traduire le reste en arrière-plan
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            translateRemainingContent();
        });
    } else {
        setTimeout(() => {
            translateRemainingContent();
        }, 2000);
    }
}

// Fonction pour traduire automatiquement tout le site
async function translateEntireSiteAutomatically() {
    // Uniquement la langue choisie dans l'app (mangaWatchLanguage)
    let currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
    currentLanguage = currentLanguage.toString().toLowerCase();
    if (currentLanguage.length > 2) currentLanguage = currentLanguage.substring(0, 2);
    if (!window.localization || !window.localization.translations[currentLanguage]) currentLanguage = 'fr';
    console.log(`🔄 Traduction automatique du site vers ${currentLanguage}...`);
    
    try {
        // Collecter tous les textes à traduire
        const textsToTranslate = [];
        const elementsToUpdate = [];
        
        // 1. Collecter les éléments avec data-i18n (toujours traduire, même en français)
        const i18nElements = document.querySelectorAll('[data-i18n]');
        for (const element of i18nElements) {
            if (element.hasAttribute('data-no-i18n')) {
                continue;
            }
            // Ne pas envoyer le bouton "Trier par genre" à l'API (sinon il repasse en fr après clic)
            // mais le traduire quand même depuis la table de localisation
            const i18nKey = element.getAttribute('data-i18n');
            if (i18nKey === 'genre_sort') {
                if (window.localization && window.localization.translations) {
                    const t = window.localization.translations;
                    const lang = t[currentLanguage] ? currentLanguage : (currentLanguage ? currentLanguage.substring(0, 2).toLowerCase() : 'fr');
                    const label = (t[lang] && t[lang].genre_sort) || (t['fr'] && t['fr'].genre_sort);
                    if (label) element.textContent = label;
                }
                continue;
            }
            
            const originalText = element.textContent.trim();
            if (originalText) {
                textsToTranslate.push(originalText);
                elementsToUpdate.push({ element, type: 'text', original: originalText });
                console.log(`🏷️ Élément statique à traduire: "${originalText}"`);
            }
        }
        
        // 2. Pour le contenu dynamique, traduire dans toutes les langues
        // Collecter les synopsis et genres (contenu dynamique)
        // IMPORTANT: Ne traduire QUE les synopsis qui sont dans .manga-info (pas dans .manga-image)
        const synopsisElements = document.querySelectorAll('.manga-info .manga-synopsis, .manga-info .content-synopsis, .profile-card-synopsis, .content-synopsis');
        const genreElements = document.querySelectorAll('.genre-tag, .type-badge');
        
        console.log(`📝 Trouvé ${synopsisElements.length} synopsis et ${genreElements.length} genres`);
        
        // Traiter les synopsis (uniquement ceux dans .manga-info)
        for (const element of synopsisElements) {
            // Vérifier que le synopsis est bien dans .manga-info et pas dans .manga-image
            if (element.closest('.manga-image')) {
                console.warn('⚠️ Synopsis trouvé dans .manga-image, ignoré:', element);
                continue;
            }
            
            if (element.hasAttribute('data-no-i18n')) {
                continue;
            }
            
            const originalText = element.textContent.trim();
            if (originalText && originalText.length > 10) {
                textsToTranslate.push(originalText);
                elementsToUpdate.push({ element, type: 'text', original: originalText });
                console.log(`📖 Synopsis à traduire: "${originalText.substring(0, 50)}..."`);
            }
        }
        
        // Fonction pour vérifier si c'est un genre valide (pas un titre d'épisode)
        function isValidGenreText(text) {
            if (!text || typeof text !== 'string') return false;
            const genreText = text.trim();
            const genreTextLower = genreText.toLowerCase();
            
            // Exclure les textes qui commencent par # suivi d'un numéro
            if (/^\s*#\d+/.test(genreText)) {
                return false;
            }
            
            // Exclure les textes contenant "Episode" ou "Épisode" suivi d'un numéro
            if (/(episode|épisode)\s*\d+/i.test(genreText)) {
                return false;
            }
            
            // Exclure les textes contenant des parenthèses avec des numéros
            if (/\([^)]*\d+[^)]*\)/.test(genreText)) {
                return false;
            }
            
            // Exclure les textes contenant ":" (suggère un titre d'épisode)
            if (/:\s/.test(genreText)) {
                return false;
            }
            
            // Exclure les textes contenant "!" ou "?" (suggère un titre)
            if (/[!?]/.test(genreText)) {
                return false;
            }
            
            // Exclure les textes avec trop de caractères spéciaux
            const specialCharCount = (genreText.match(/[#:()[\]{}'",;!?]/g) || []).length;
            if (specialCharCount > 1) {
                return false;
            }
            
            // Exclure les textes qui ressemblent à des phrases (trop de mots)
            const words = genreTextLower.split(/\s+/);
            if (words.length > 5) {
                return false;
            }
            
            // Vérifier que c'est bien un genre ou type (texte court, pas de ponctuation excessive)
            if (genreText.length >= 50 || genreText.includes('.')) {
                return false;
            }
            
            // Exclure les textes contenant des mots spécifiques suggérant un titre
            if (/oppai|motomemasu|minorimasu/i.test(genreText)) {
                return false;
            }
            
            return true;
        }
        
        // Traiter les genres séparément (avec table de traductions, pas l'API)
        const genreElementsToTranslate = [];
        for (const element of genreElements) {
            if (element.hasAttribute('data-no-i18n')) {
                continue;
            }
            
            const originalText = element.textContent.trim();
            // Pour les genres, vérifier que c'est bien un genre valide (pas un titre d'épisode)
            if (originalText && isValidGenreText(originalText)) {
                genreElementsToTranslate.push({ element, originalText });
                console.log(`🏷️ Genre à traduire: "${originalText}"`);
            } else if (originalText) {
                console.warn(`⚠️ Genre invalide filtré: "${originalText}" - ignoré (ressemble à un titre d'épisode)`);
            }
        }
        
        // Traduire les genres avec une table de traductions (pas l'API pour éviter les mélanges)
        const genreTranslations = {
            'Action': { en: 'Action', fr: 'Action', de: 'Action', es: 'Acción', it: 'Azione', ja: 'アクション' },
            'Adventure': { en: 'Adventure', fr: 'Aventure', de: 'Abenteuer', es: 'Aventura', it: 'Avventura', ja: '冒険' },
            'Aventure': { en: 'Adventure', fr: 'Aventure', de: 'Abenteuer', es: 'Aventura', it: 'Avventura', ja: '冒険' },
            'Comedy': { en: 'Comedy', fr: 'Comédie', de: 'Komödie', es: 'Comedia', it: 'Commedia', ja: 'コメディ' },
            'Comédie': { en: 'Comedy', fr: 'Comédie', de: 'Komödie', es: 'Comedia', it: 'Commedia', ja: 'コメディ' },
            'Romance': { en: 'Romance', fr: 'Romance', de: 'Romance', es: 'Romance', it: 'Romance', ja: 'ロマンス' },
            'Drama': { en: 'Drama', fr: 'Drame', de: 'Drama', es: 'Drama', it: 'Dramma', ja: 'ドラマ' },
            'Drame': { en: 'Drama', fr: 'Drame', de: 'Drama', es: 'Drama', it: 'Dramma', ja: 'ドラマ' },
            'Fantasy': { en: 'Fantasy', fr: 'Fantasy', de: 'Fantasy', es: 'Fantasía', it: 'Fantasy', ja: 'ファンタジー' },
            'Supernatural': { en: 'Supernatural', fr: 'Surnaturel', de: 'Übernatürlich', es: 'Sobrenatural', it: 'Soprannaturale', ja: '超自然' },
            'Surnaturel': { en: 'Supernatural', fr: 'Surnaturel', de: 'Übernatürlich', es: 'Sobrenatural', it: 'Soprannaturale', ja: '超自然' },
            'Horror': { en: 'Horror', fr: 'Horreur', de: 'Horror', es: 'Terror', it: 'Horror', ja: 'ホラー' },
            'Horreur': { en: 'Horror', fr: 'Horreur', de: 'Horror', es: 'Terror', it: 'Horror', ja: 'ホラー' },
            'Mystery': { en: 'Mystery', fr: 'Mystère', de: 'Mystery', es: 'Misterio', it: 'Mistero', ja: 'ミステリー' },
            'Mystère': { en: 'Mystery', fr: 'Mystère', de: 'Mystery', es: 'Misterio', it: 'Mistero', ja: 'ミステリー' },
            'Sci-Fi': { en: 'Sci-Fi', fr: 'Science-Fiction', de: 'Science Fiction', es: 'Ciencia Ficción', it: 'Sci-Fi', ja: 'SF' },
            'Science-Fiction': { en: 'Sci-Fi', fr: 'Science-Fiction', de: 'Science Fiction', es: 'Ciencia Ficción', it: 'Sci-Fi', ja: 'SF' },
            'Slice of Life': { en: 'Slice of Life', fr: 'Tranche de vie', de: 'Slice of Life', es: 'Recuentos de la Vida', it: 'Slice of Life', ja: '日常' },
            'Sports': { en: 'Sports', fr: 'Sport', de: 'Sport', es: 'Deportes', it: 'Sport', ja: 'スポーツ' },
            'Sport': { en: 'Sports', fr: 'Sport', de: 'Sport', es: 'Deportes', it: 'Sport', ja: 'スポーツ' },
            'Thriller': { en: 'Thriller', fr: 'Thriller', de: 'Thriller', es: 'Thriller', it: 'Thriller', ja: 'スリラー' },
            'Ecchi': { en: 'Ecchi', fr: 'Ecchi', de: 'Ecchi', es: 'Ecchi', it: 'Ecchi', ja: 'エッチ' },
            'Anime': { en: 'Anime', fr: 'Anime', de: 'Anime', es: 'Anime', it: 'Anime', ja: 'アニメ' }
        };
        
        // Traduire les genres immédiatement avec la table
        genreElementsToTranslate.forEach(({ element, originalText }) => {
            if (!element.isConnected) return;
            
            const genreKey = originalText.trim();
            const translatedGenre = genreTranslations[genreKey]?.[currentLanguage] || 
                                   genreTranslations[genreKey]?.[currentLanguage.substring(0, 2)] ||
                                   originalText; // Garder l'original si pas de traduction
            
            if (translatedGenre && translatedGenre !== genreKey) {
                element.textContent = translatedGenre;
                console.log(`✅ Genre traduit (table): "${genreKey}" -> "${translatedGenre}"`);
            }
        });
        
        // 3. Traduire les autres textes (synopsis, etc.) par lots avec l'API
        if (textsToTranslate.length > 0) {
            console.log(`🚀 Traduction de ${textsToTranslate.length} éléments...`);
            
            // Traduire par lots de 10 éléments pour plus de rapidité
            const batchSize = 10;
            for (let i = 0; i < textsToTranslate.length; i += batchSize) {
                const batch = textsToTranslate.slice(i, i + batchSize);
                const batchElements = elementsToUpdate.slice(i, i + batchSize);
                
                try {
                    const translatedBatch = await translateBatch(batch, currentLanguage);
                    
                    // Appliquer les traductions
                    batchElements.forEach((item, index) => {
                        const translatedText = translatedBatch[index];
                        if (translatedText && translatedText !== item.original) {
                            // Vérifier que l'élément est toujours dans le DOM et à la bonne place
                            if (!item.element.isConnected) {
                                console.warn('⚠️ Élément non connecté au DOM, ignoré:', item.original.substring(0, 30));
                                return;
                            }
                            
                            // Vérifier que l'élément n'est pas dans manga-image
                            if (item.element.closest('.manga-image')) {
                                console.warn('⚠️ Élément dans manga-image, ignoré:', item.original.substring(0, 30));
                                return;
                            }
                            
                            // Vérifier que c'est bien un synopsis dans manga-info
                            if (item.element.classList.contains('manga-synopsis') || item.element.classList.contains('content-synopsis')) {
                                const mangaInfo = item.element.closest('.manga-info');
                                if (!mangaInfo) {
                                    console.warn('⚠️ Synopsis pas dans manga-info, ignoré:', item.original.substring(0, 30));
                                    return;
                                }
                            }
                            
                            item.element.textContent = translatedText;
                            console.log(`✅ Traduit: "${item.original.substring(0, 30)}..." -> "${translatedText.substring(0, 30)}..."`);
                        }
                    });
                    
                    // Délai réduit entre les lots
                    if (i + batchSize < textsToTranslate.length) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                } catch (error) {
                    console.error('❌ Erreur lors de la traduction par lots:', error);
                }
            }
        } else {
            console.log('ℹ️ Aucun élément à traduire');
        }
        
        console.log('✅ Traduction automatique terminée');
        
    } catch (error) {
        console.error('❌ Erreur lors de la traduction automatique:', error);
    }
}

// Fonction pour traduire spécifiquement la page collection
async function translateCollectionPage(targetLanguage) {
    // Vérifier si on est sur la page collection ou user-profile
    const isCollectionPage = document.querySelector('.list-container') || document.querySelector('.list-grid');
    if (!isCollectionPage) {
        return; // Pas sur la page collection
    }
    
    console.log('🔄 Traduction de la page collection...');
    
    // Traduire les boutons de filtre de type
    const typeFilters = document.querySelectorAll('.type-filter');
    for (const filter of typeFilters) {
        const textElement = filter.querySelector('span');
        if (textElement) {
            const originalText = textElement.textContent.trim();
            if (originalText && shouldTranslate(originalText, targetLanguage)) {
                const translatedText = await translateWithCache(originalText, targetLanguage);
                if (translatedText && translatedText !== originalText) {
                    textElement.textContent = translatedText;
                }
            }
        }
    }
    
    // Traduire les labels des statistiques
    const statLabels = document.querySelectorAll('.stat-label');
    for (const label of statLabels) {
        const originalText = label.textContent.trim();
        if (originalText && shouldTranslate(originalText, targetLanguage)) {
            const translatedText = await translateWithCache(originalText, targetLanguage);
            if (translatedText && translatedText !== originalText) {
                label.textContent = translatedText;
            }
        }
    }
    
    // Traduire les messages d'état vide
    const emptyMessages = document.querySelectorAll('.empty-state h2, .empty-state p');
    for (const message of emptyMessages) {
        const originalText = message.textContent.trim();
        if (originalText && shouldTranslate(originalText, targetLanguage)) {
            const translatedText = await translateWithCache(originalText, targetLanguage);
            if (translatedText && translatedText !== originalText) {
                message.textContent = translatedText;
            }
        }
    }
    
    // Traduire les boutons de changement de statut dans les cartes
    const changeStatusButtons = document.querySelectorAll('.change-status-btn span[data-i18n]');
    for (const button of changeStatusButtons) {
        const originalText = button.textContent.trim();
        if (originalText && shouldTranslate(originalText, targetLanguage)) {
            const translatedText = await translateWithCache(originalText, targetLanguage);
            if (translatedText && translatedText !== originalText) {
                button.textContent = translatedText;
            }
        }
    }
    
    // Traduire les éléments du modal de statut
    const modalElements = document.querySelectorAll('#status-modal [data-i18n]');
    for (const element of modalElements) {
        const originalText = element.textContent.trim();
        if (originalText && shouldTranslate(originalText, targetLanguage)) {
            const translatedText = await translateWithCache(originalText, targetLanguage);
            if (translatedText && translatedText !== originalText) {
                element.textContent = translatedText;
            }
        }
    }
    
    // Traduire les messages de confirmation de suppression
    const deleteElements = document.querySelectorAll('[data-i18n^="collection.delete."]');
    for (const element of deleteElements) {
        const originalText = element.textContent.trim();
        if (originalText && shouldTranslate(originalText, targetLanguage)) {
            const translatedText = await translateWithCache(originalText, targetLanguage);
            if (translatedText && translatedText !== originalText) {
                element.textContent = translatedText;
            }
        }
    }
    
    // Traduire les éléments de pagination
    const paginationElements = document.querySelectorAll('[data-i18n^="collection.pagination."]');
    for (const element of paginationElements) {
        const originalText = element.textContent.trim();
        if (originalText && shouldTranslate(originalText, targetLanguage)) {
            const translatedText = await translateWithCache(originalText, targetLanguage);
            if (translatedText && translatedText !== originalText) {
                element.textContent = translatedText;
            }
        }
    }
    
    // Traduire les messages d'état vide
    const emptyListElements = document.querySelectorAll('[data-i18n^="collection.empty."]');
    for (const element of emptyListElements) {
        const originalText = element.textContent.trim();
        if (originalText && shouldTranslate(originalText, targetLanguage)) {
            const translatedText = await translateWithCache(originalText, targetLanguage);
            if (translatedText && translatedText !== originalText) {
                element.textContent = translatedText;
            }
        }
    }
    
    // Traduire les synopsis des cartes
    const synopsisElements = document.querySelectorAll('.item-synopsis');
    for (const element of synopsisElements) {
        const originalText = element.textContent.trim();
        if (originalText && originalText.length > 10) { // Traduire si le texte fait plus de 10 caractères
            const translatedText = await translateWithCache(originalText, targetLanguage);
            if (translatedText && translatedText !== originalText) {
                element.textContent = translatedText;
            }
        }
    }
    
    console.log('✅ Page collection traduite');
}

// Fonction pour supprimer les traductions manuelles et utiliser uniquement l'API
function removeManualTranslations() {
    console.log('🗑️ Suppression des traductions manuelles...');
    
    // Supprimer les traductions manuelles du fichier localization.js
    // Garder seulement les clés essentielles et laisser l'API traduire le reste
    
    const essentialKeys = {
        fr: {
            'nav.home': 'Accueil',
            'nav.manga_anime': 'Mangas & Anime',
            'nav.collection': 'Collection',
            'nav.profile': 'Profil',
            'nav.tierlist': 'Tier List',
            'nav.forum': 'Forum'
        }
    };
    
    // Remplacer les traductions par les clés essentielles seulement
    this.translations = essentialKeys;
    
    console.log('✅ Traductions manuelles supprimées, utilisation de l\'API uniquement');
}

// Mapping des noms de genres (API = anglais) vers les libellés par langue (profil, cartes, boutons filtre)
const GENRE_API_TO_LOCALIZED = {
    'Action': { fr: 'Action', en: 'Action', de: 'Action', es: 'Acción', it: 'Azione', ja: 'アクション' },
    'Adventure': { fr: 'Aventure', en: 'Adventure', de: 'Abenteuer', es: 'Aventura', it: 'Avventura', ja: '冒険' },
    'Avant Garde': { fr: 'Avant-garde', en: 'Avant Garde', de: 'Avantgarde', es: 'Vanguardia', it: 'Avanguardia', ja: '前衛' },
    'Award Winning': { fr: 'Prix', en: 'Award Winning', de: 'Preisgekrönt', es: 'Ganador de Premios', it: 'Vincitore di Premi', ja: '受賞作' },
    'Boys Love': { fr: 'Boys Love', en: 'Boys Love', de: 'Boys Love', es: 'Boys Love', it: 'Boys Love', ja: 'ボーイズラブ' },
    'Comedy': { fr: 'Comédie', en: 'Comedy', de: 'Komödie', es: 'Comedia', it: 'Commedia', ja: 'コメディ' },
    'Drama': { fr: 'Drame', en: 'Drama', de: 'Drama', es: 'Drama', it: 'Dramma', ja: 'ドラマ' },
    'Fantasy': { fr: 'Fantasy', en: 'Fantasy', de: 'Fantasy', es: 'Fantasía', it: 'Fantasy', ja: 'ファンタジー' },
    'Girls Love': { fr: 'Girls Love', en: 'Girls Love', de: 'Girls Love', es: 'Girls Love', it: 'Girls Love', ja: 'ガールズラブ' },
    'Gourmet': { fr: 'Gastronomie', en: 'Gourmet', de: 'Gourmet', es: 'Gastronomía', it: 'Gastronomia', ja: 'グルメ' },
    'Horror': { fr: 'Horreur', en: 'Horror', de: 'Horror', es: 'Terror', it: 'Horror', ja: 'ホラー' },
    'Mystery': { fr: 'Mystère', en: 'Mystery', de: 'Mystery', es: 'Misterio', it: 'Mistero', ja: 'ミステリー' },
    'Romance': { fr: 'Romance', en: 'Romance', de: 'Romance', es: 'Romance', it: 'Romance', ja: 'ロマンス' },
    'Sci-Fi': { fr: 'Science-Fiction', en: 'Sci-Fi', de: 'Science Fiction', es: 'Ciencia Ficción', it: 'Sci-Fi', ja: 'SF' },
    'Slice of Life': { fr: 'Tranche de vie', en: 'Slice of Life', de: 'Slice of Life', es: 'Recuentos de la Vida', it: 'Slice of Life', ja: '日常' },
    'Sports': { fr: 'Sport', en: 'Sports', de: 'Sport', es: 'Deportes', it: 'Sport', ja: 'スポーツ' },
    'Supernatural': { fr: 'Surnaturel', en: 'Supernatural', de: 'Übernatürlich', es: 'Sobrenatural', it: 'Soprannaturale', ja: '超自然' },
    'Suspense': { fr: 'Suspense', en: 'Suspense', de: 'Spannung', es: 'Suspenso', it: 'Suspense', ja: 'サスペンス' },
    'Ecchi': { fr: 'Ecchi', en: 'Ecchi', de: 'Ecchi', es: 'Ecchi', it: 'Ecchi', ja: 'エッチ' },
    'Erotica': { fr: 'Érotique', en: 'Erotica', de: 'Erotik', es: 'Erótica', it: 'Erotica', ja: 'エロ' },
    'Hentai': { fr: 'Hentai', en: 'Hentai', de: 'Hentai', es: 'Hentai', it: 'Hentai', ja: '変態' },
    'Adult Cast': { fr: 'Casting adulte', en: 'Adult Cast', de: 'Erwachsenen-Cast', es: 'Elenco adulto', it: 'Cast adulto', ja: '大人向け' },
    'Anthropomorphic': { fr: 'Anthropomorphique', en: 'Anthropomorphic', de: 'Anthropomorph', es: 'Antropomórfico', it: 'Antropomorfico', ja: '擬人化' },
    'CGDCT': { fr: 'CGDCT', en: 'CGDCT', de: 'CGDCT', es: 'CGDCT', it: 'CGDCT', ja: '日常系' },
    'Childcare': { fr: 'Garde d\'enfants', en: 'Childcare', de: 'Kinderbetreuung', es: 'Cuidado infantil', it: 'Cura dei bambini', ja: '育児' },
    'Combat Sports': { fr: 'Sport de combat', en: 'Combat Sports', de: 'Kampfsport', es: 'Deportes de combate', it: 'Sport da combattimento', ja: '格闘技' },
    'Crossdressing': { fr: 'Travestissement', en: 'Crossdressing', de: 'Crossdressing', es: 'Travestismo', it: 'Travestitismo', ja: '男の娘' },
    'Delinquents': { fr: 'Délinquants', en: 'Delinquents', de: 'Delinquenten', es: 'Delincuentes', it: 'Delinquenti', ja: '不良' },
    'Detective': { fr: 'Détective', en: 'Detective', de: 'Detektiv', es: 'Detective', it: 'Detective', ja: '推理' },
    'Educational': { fr: 'Éducatif', en: 'Educational', de: 'Bildend', es: 'Educativo', it: 'Educativo', ja: '教育' },
    'Gag Humor': { fr: 'Humour gags', en: 'Gag Humor', de: 'Gag-Humor', es: 'Humor de gags', it: 'Umorismo gag', ja: 'ギャグ' },
    'Gore': { fr: 'Gore', en: 'Gore', de: 'Gore', es: 'Gore', it: 'Gore', ja: 'ゴア' },
    'Harem': { fr: 'Harem', en: 'Harem', de: 'Harem', es: 'Harem', it: 'Harem', ja: 'ハーレム' },
    'High Stakes Game': { fr: 'Jeu à enjeux élevés', en: 'High Stakes Game', de: 'Spiel mit hohem Einsatz', es: 'Juego de alto riesgo', it: 'Gioco ad alta posta', ja: 'ハイステークス' },
    'Historical': { fr: 'Historique', en: 'Historical', de: 'Historisch', es: 'Histórico', it: 'Storico', ja: '歴史' },
    'Idols (Female)': { fr: 'Idoles (Femmes)', en: 'Idols (Female)', de: 'Idole (weiblich)', es: 'Ídolos (femenino)', it: 'Idoli (femminile)', ja: '女性アイドル' },
    'Idols (Male)': { fr: 'Idoles (Hommes)', en: 'Idols (Male)', de: 'Idole (männlich)', es: 'Ídolos (masculino)', it: 'Idoli (maschile)', ja: '男性アイドル' },
    'Isekai': { fr: 'Isekai', en: 'Isekai', de: 'Isekai', es: 'Isekai', it: 'Isekai', ja: '異世界' },
    'Iyashikei': { fr: 'Iyashikei', en: 'Iyashikei', de: 'Iyashikei', es: 'Iyashikei', it: 'Iyashikei', ja: '癒し系' },
    'Love Polygon': { fr: 'Polygone amoureux', en: 'Love Polygon', de: 'Liebespolygon', es: 'Polígono amoroso', it: 'Poligono amoroso', ja: '恋愛群像' },
    'Romantic Subtext': { fr: 'Statut amoureux', en: 'Romantic Subtext', de: 'Romantischer Subtext', es: 'Subtexto romántico', it: 'Sottotesto romantico', ja: '恋愛' },
    'Magical Sex Shift': { fr: 'Changement de sexe magique', en: 'Magical Sex Shift', de: 'Magischer Geschlechtswechsel', es: 'Cambio de sexo mágico', it: 'Cambio di sesso magico', ja: '性転換' },
    'Magical Girls': { fr: 'Magical Girl', en: 'Magical Girls', de: 'Magische Mädchen', es: 'Chicas mágicas', it: 'Magical Girl', ja: '魔法少女' },
    'Magical Girl': { fr: 'Magical Girl', en: 'Magical Girls', de: 'Magische Mädchen', es: 'Chicas mágicas', it: 'Magical Girl', ja: '魔法少女' },
    'Martial Arts': { fr: 'Arts martiaux', en: 'Martial Arts', de: 'Kampfkunst', es: 'Artes marciales', it: 'Arti marziali', ja: '武道' },
    'Mecha': { fr: 'Mecha', en: 'Mecha', de: 'Mecha', es: 'Mecha', it: 'Mecha', ja: 'メカ' },
    'Medical': { fr: 'Médical', en: 'Medical', de: 'Medizin', es: 'Médico', it: 'Medico', ja: '医療' },
    'Military': { fr: 'Militaire', en: 'Military', de: 'Militär', es: 'Militar', it: 'Militare', ja: '軍事' },
    'Music': { fr: 'Musique', en: 'Music', de: 'Musik', es: 'Música', it: 'Musica', ja: '音楽' },
    'Mythology': { fr: 'Mythologie', en: 'Mythology', de: 'Mythologie', es: 'Mitolología', it: 'Mitologia', ja: '神話' },
    'Organized Crime': { fr: 'Crime organisé', en: 'Organized Crime', de: 'Organisierte Kriminalität', es: 'Crimen organizado', it: 'Criminalità organizzata', ja: '組織犯罪' },
    'Otaku Culture': { fr: 'Culture Otaku', en: 'Otaku Culture', de: 'Otaku-Kultur', es: 'Cultura otaku', it: 'Cultura otaku', ja: 'オタク' },
    'Parody': { fr: 'Parodie', en: 'Parody', de: 'Parodie', es: 'Parodia', it: 'Parodia', ja: 'パロディ' },
    'Performing Arts': { fr: 'Arts du spectacle', en: 'Performing Arts', de: 'Darstellende Kunst', es: 'Artes escénicas', it: 'Arti performative', ja: '芸能' },
    'Pets': { fr: 'Animaux', en: 'Pets', de: 'Haustiere', es: 'Mascotas', it: 'Animali', ja: 'ペット' },
    'Psychological': { fr: 'Psychologique', en: 'Psychological', de: 'Psychologisch', es: 'Psicológico', it: 'Psicologico', ja: '心理' },
    'Racing': { fr: 'Course', en: 'Racing', de: 'Rennsport', es: 'Carreras', it: 'Corse', ja: 'レース' },
    'Reincarnation': { fr: 'Réincarnation', en: 'Reincarnation', de: 'Reinkarnation', es: 'Reencarnación', it: 'Reincarnazione', ja: '転生' },
    'Reverse Harem': { fr: 'Harem inversé', en: 'Reverse Harem', de: 'Reverse Harem', es: 'Harem inverso', it: 'Harem inverso', ja: '逆ハーレム' },
    'Samurai': { fr: 'Samouraï', en: 'Samurai', de: 'Samurai', es: 'Samurái', it: 'Samurai', ja: '侍' },
    'School': { fr: 'École', en: 'School', de: 'Schule', es: 'Escuela', it: 'Scuola', ja: '学校' },
    'Showbiz': { fr: 'Showbiz', en: 'Showbiz', de: 'Showbiz', es: 'Showbiz', it: 'Showbiz', ja: '芸能界' },
    'Space': { fr: 'Espace', en: 'Space', de: 'Weltraum', es: 'Espacio', it: 'Spazio', ja: '宇宙' },
    'Strategy Game': { fr: 'Jeu de stratégie', en: 'Strategy Game', de: 'Strategiespiel', es: 'Juego de estrategia', it: 'Gioco di strategia', ja: '戦略ゲーム' },
    'Super Power': { fr: 'Super pouvoir', en: 'Super Power', de: 'Superkraft', es: 'Superpoder', it: 'Superpotere', ja: '超能力' },
    'Survival': { fr: 'Survie', en: 'Survival', de: 'Überleben', es: 'Supervivencia', it: 'Sopravvivenza', ja: 'サバイバル' },
    'Team Sports': { fr: 'Sport d\'équipe', en: 'Team Sports', de: 'Mannschaftssport', es: 'Deportes de equipo', it: 'Sport di squadra', ja: 'チームスポーツ' },
    'Time Travel': { fr: 'Voyage temporel', en: 'Time Travel', de: 'Zeitreise', es: 'Viaje en el tiempo', it: 'Viaggio nel tempo', ja: 'タイムトラベル' },
    'Urban Fantasy': { fr: 'Fantasy urbaine', en: 'Urban Fantasy', de: 'Urban Fantasy', es: 'Fantasía urbana', it: 'Fantasy urbano', ja: '都市ファンタジー' },
    'Vampire': { fr: 'Vampire', en: 'Vampire', de: 'Vampir', es: 'Vampiro', it: 'Vampiro', ja: '吸血鬼' },
    'Video Game': { fr: 'Jeu vidéo', en: 'Video Game', de: 'Videospiel', es: 'Videojuego', it: 'Videogioco', ja: 'ゲーム' },
    'Villainess': { fr: 'Villainess', en: 'Villainess', de: 'Villainess', es: 'Villana', it: 'Villainess', ja: '悪役令嬢' },
    'Visual Arts': { fr: 'Arts visuels', en: 'Visual Arts', de: 'Bildende Kunst', es: 'Artes visuales', it: 'Arti visive', ja: '芸術' },
    'Workplace': { fr: 'Lieu de travail', en: 'Workplace', de: 'Arbeitsplatz', es: 'Lugar de trabajo', it: 'Posto di lavoro', ja: '職場' },
    'Doujin': { fr: 'Doujin', en: 'Doujin', de: 'Doujin', es: 'Doujin', it: 'Doujin', ja: '同人' },
    'Manhwa': { fr: 'Manhwa', en: 'Manhwa', de: 'Manhwa', es: 'Manhwa', it: 'Manhwa', ja: 'マンファ' },
    'Manhua': { fr: 'Manhua', en: 'Manhua', de: 'Manhua', es: 'Manhua', it: 'Manhua', ja: 'マンファ' }
};

function getTranslatedGenre(apiGenreName) {
    if (!apiGenreName || typeof apiGenreName !== 'string') return apiGenreName || '';
    let currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
    currentLanguage = (currentLanguage && currentLanguage.toString().toLowerCase().substring(0, 2)) || 'fr';
    const normalized = apiGenreName.trim();
    const map = GENRE_API_TO_LOCALIZED[normalized] || GENRE_API_TO_LOCALIZED[normalized.replace(/\s+/g, ' ')];
    if (map && map[currentLanguage]) return map[currentLanguage];
    return apiGenreName;
}

// Exposer les fonctions globalement
window.translateEntireSiteAutomatically = translateEntireSiteAutomatically;
window.translateCollectionPage = translateCollectionPage;
window.removeManualTranslations = removeManualTranslations;
window.getTranslatedGenre = getTranslatedGenre;
window.translateSynopses = translateSynopses;

// ... existing code ... 

// Fonction pour déterminer quel titre afficher selon la langue et les préférences
function getDisplayTitle(content, targetLanguage) {
    if (!content) return '';
    
    // Récupérer les différents titres disponibles
    const titles = {
        original: content.title || '', // Titre principal (souvent japonais)
        japanese: content.title_japanese || content.title || '',
        english: content.title_english || '',
        french: content.title_french || '' // Si disponible dans l'API
    };
    
    // Logique d'affichage selon la langue
    switch (targetLanguage) {
        case 'en': // Anglais
            // Priorité : titre anglais, puis titre original
            return titles.english || titles.original;
            
        default: // Toutes les autres langues (ja, fr, de, es, it)
            // Priorité : titre original pour toutes les langues
            return titles.original;
    }
}

// Fonction pour afficher les titres alternatifs dans les pages de détails
function displayAlternativeTitles(content, container) {
    if (!content || !container) return;
    
    const titles = {
        original: content.title || '',
        japanese: content.title_japanese || '',
        english: content.title_english || '',
        french: content.title_french || ''
    };
    
    // Créer la section des titres alternatifs
    let alternativeTitlesHTML = '<div class="alternative-titles-section">';
    alternativeTitlesHTML += '<h3 data-i18n="alternative_titles">Titres alternatifs</h3>';
    alternativeTitlesHTML += '<ul class="alternative-titles-list">';
    
    // Afficher les titres disponibles
    if (titles.japanese && titles.japanese !== titles.original) {
        alternativeTitlesHTML += `<li><span class="label" data-i18n="japanese_title">Titre japonais :</span> <span class="value">${titles.japanese}</span></li>`;
    }
    
    if (titles.english && titles.english !== titles.original) {
        alternativeTitlesHTML += `<li><span class="label" data-i18n="english_title">Titre anglais :</span> <span class="value">${titles.english}</span></li>`;
    }
    
    if (titles.french && titles.french !== titles.original) {
        alternativeTitlesHTML += `<li><span class="label" data-i18n="french_title">Titre français :</span> <span class="value">${titles.french}</span></li>`;
    }
    
    alternativeTitlesHTML += '</ul></div>';
    
    // Insérer après le titre principal
    const titleElement = container.querySelector('.details-title');
    if (titleElement) {
        titleElement.insertAdjacentHTML('afterend', alternativeTitlesHTML);
    }
}

// Fonction pour traduire les indicateurs de saison/partie
async function translateSeasonIndicators(targetLanguage) {
    const seasonPatterns = [
        /season\s+(\d+)/gi,
        /part\s+(\d+)/gi,
        /saison\s+(\d+)/gi,
        /partie\s+(\d+)/gi,
        /temporada\s+(\d+)/gi,
        /parte\s+(\d+)/gi,
        /staffel\s+(\d+)/gi,
        /teil\s+(\d+)/gi,
        /stagione\s+(\d+)/gi,
        /parte\s+(\d+)/gi,
        /シーズン\s*(\d+)/gi,
        /パート\s*(\d+)/gi
    ];
    
    const titleElements = document.querySelectorAll('.details-title, .content-title, .anime-title, .manga-title');
    const textsToTranslate = [];
    const elementsToUpdate = [];
    
    console.log(`🔍 Recherche d'indicateurs de saison/partie dans ${titleElements.length} titres`);
    
    titleElements.forEach((element, elementIndex) => {
        // Ignorer les éléments avec data-no-i18n
        if (element.hasAttribute('data-no-i18n')) {
            console.log(`⏭️ Titre ${elementIndex + 1} ignoré (data-no-i18n): "${element.textContent.trim()}"`);
            return;
        }
        
        const currentText = element.textContent.trim();
        console.log(`📝 Titre ${elementIndex + 1}: "${currentText}"`);
        
        // Vérifier si le titre contient un indicateur de saison/partie
        seasonPatterns.forEach((pattern, patternIndex) => {
            if (pattern.test(currentText)) {
                console.log(`✅ Pattern ${patternIndex + 1} trouvé dans "${currentText}"`);
                
                // Extraire le numéro
                const match = currentText.match(pattern);
                if (match) {
                    const number = match[1];
                    const indicator = match[0].toLowerCase();
                    
                    console.log(`📊 Match trouvé: "${match[0]}" - Numéro: "${number}" - Indicateur: "${indicator}"`);
                    
                    // Déterminer le type d'indicateur à traduire
                    let indicatorToTranslate = '';
                    if (indicator.includes('season') || indicator.includes('saison')) {
                        indicatorToTranslate = 'season';
                    } else if (indicator.includes('part') || indicator.includes('partie')) {
                        indicatorToTranslate = 'part';
                    }
                    
                    if (indicatorToTranslate) {
                        console.log(`🔄 Ajout pour traduction: ${indicatorToTranslate} (numéro: ${number})`);
                        textsToTranslate.push(indicatorToTranslate);
                        elementsToUpdate.push({ 
                            element, 
                            number: number, 
                            type: indicatorToTranslate,
                            originalText: currentText,
                            match: match[0]
                        });
                    }
                }
            }
        });
    });
    
    if (textsToTranslate.length > 0) {
        console.log(`🎬 Traduction de ${textsToTranslate.length} indicateurs de saison/partie`);
        console.log(`📋 Éléments à mettre à jour:`, elementsToUpdate);
        
        // Traduire les indicateurs
        let translatedIndicators;
        if (targetLanguage === 'fr') {
            // Utiliser des traductions hardcodées pour le test
            translatedIndicators = textsToTranslate.map(text => {
                if (text === 'season') return 'Saison';
                if (text === 'part') return 'Partie';
                return text;
            });
        } else {
            translatedIndicators = await translateBatch(textsToTranslate, targetLanguage);
        }
        console.log(`🌐 Indicateurs traduits:`, translatedIndicators);
        
        // Appliquer les traductions
        elementsToUpdate.forEach((item, index) => {
            const translatedIndicator = translatedIndicators[index];
            console.log(`🔄 Application traduction ${index + 1}:`, {
                originalText: item.originalText,
                translatedIndicator: translatedIndicator,
                number: item.number,
                type: item.type
            });
            
            if (translatedIndicator && item.number) {
                const currentText = item.element.textContent;
                
                // Utiliser le pattern exact qui a été trouvé pour éviter les problèmes avec les regex globales
                let newText = currentText;
                
                if (item.type === 'season') {
                    // Remplacer tous les patterns de saison
                    newText = newText.replace(/(season|saison|temporada|staffel|stagione|シーズン)\s*(\d+)/gi, 
                        (match, indicator, number) => {
                            console.log(`🔄 Remplacement saison: "${match}" → "${translatedIndicator} ${number}"`);
                            return `${translatedIndicator} ${number}`;
                        });
                } else if (item.type === 'part') {
                    // Remplacer tous les patterns de partie
                    newText = newText.replace(/(part|partie|parte|teil|パート)\s*(\d+)/gi, 
                        (match, indicator, number) => {
                            console.log(`🔄 Remplacement partie: "${match}" → "${translatedIndicator} ${number}"`);
                            return `${translatedIndicator} ${number}`;
                        });
                }
                
                console.log(`📝 Remplacement final: "${currentText}" → "${newText}"`);
                item.element.textContent = newText;
            } else {
                console.warn(`⚠️ Traduction ou numéro manquant pour l'élément ${index + 1}:`, {
                    translatedIndicator: translatedIndicator,
                    number: item.number
                });
            }
        });
    } else {
        console.log(`ℹ️ Aucun indicateur de saison/partie trouvé`);
    }
}

// Fonction pour mettre à jour l'affichage des titres selon la langue
function updateTitleDisplay(targetLanguage) {
    const titleElements = document.querySelectorAll('.details-title, .content-title, .anime-title, .manga-title');
    
    titleElements.forEach(element => {
        // Ignorer les éléments avec data-no-i18n
        if (element.hasAttribute('data-no-i18n')) {
            return;
        }
        
        // Récupérer les données du contenu depuis l'attribut data ou le contexte
        const contentData = element.closest('[data-content]')?.dataset?.content;
        if (contentData) {
            try {
                const content = JSON.parse(contentData);
                const displayTitle = getDisplayTitle(content, targetLanguage);
                if (displayTitle && displayTitle !== element.textContent) {
                    element.textContent = displayTitle;
                }
            } catch (e) {
                console.warn('Erreur lors du parsing des données de contenu:', e);
            }
        }
    });
}

// ... existing code ... 

// Fonction pour traduire progressivement le contenu visible
async function translateVisibleContent() {
    const currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
    if (currentLanguage === 'en') return;
    
    console.log('🔄 Traduction progressive du contenu visible...');
    
    // Traduire d'abord les éléments visibles
    const visibleSynopses = document.querySelectorAll('.synopsis-text, .content-synopsis, .anime-synopsis, .manga-synopsis');
    const visibleGenres = document.querySelectorAll('.genre-tag');
    
    // Traduire les synopses visibles en premier
    for (const element of visibleSynopses) {
        // Ignorer les éléments avec data-no-i18n
        if (element.hasAttribute('data-no-i18n')) {
            continue;
        }
        if (isElementInViewport(element)) {
            const originalText = element.textContent.trim();
            if (originalText && shouldTranslate(originalText, currentLanguage)) {
                try {
                    const translatedText = await translateWithCache(originalText, currentLanguage);
                    if (translatedText && translatedText.trim() !== '' && translatedText !== originalText) {
                        element.textContent = translatedText;
                    }
                } catch (error) {
                    console.warn('Erreur lors de la traduction progressive:', error);
                }
            }
        }
    }
    
    // Traduire les genres visibles
    for (const element of visibleGenres) {
        // Ignorer les éléments avec data-no-i18n
        if (element.hasAttribute('data-no-i18n')) {
            continue;
        }
        if (isElementInViewport(element)) {
            const originalText = element.textContent.trim();
            if (originalText && shouldTranslate(originalText, currentLanguage)) {
                try {
                    const translatedText = await translateWithCache(originalText, currentLanguage);
                    if (translatedText && translatedText.trim() !== '' && translatedText !== originalText) {
                        element.textContent = translatedText;
                    }
                } catch (error) {
                    console.warn('Erreur lors de la traduction progressive:', error);
                }
            }
        }
    }
    
    console.log('✅ Traduction progressive terminée');
}

// Fonction pour vérifier si un élément est visible dans le viewport
function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// ... existing code ...

// Fonction pour traduire les valeurs dynamiques des informations générales
async function translateGeneralInfoValues(targetLanguage) {
    if (targetLanguage === 'en') return;
    
    console.log('🔄 Traduction des valeurs des informations générales...');
    
    // Sélectionner tous les éléments de valeur dans les informations générales
    const valueElements = document.querySelectorAll('.additional-info li .value');
    console.log(`📊 Trouvé ${valueElements.length} éléments de valeur à traiter`);
    
    // Si aucun élément trouvé, attendre un peu et réessayer
    if (valueElements.length === 0) {
        console.log('⏳ Aucun élément trouvé, nouvelle tentative dans 1 seconde...');
        setTimeout(() => {
            translateGeneralInfoValues(targetLanguage);
        }, 1000);
        return;
    }
    
    for (const element of valueElements) {
        // Ignorer les éléments avec data-no-i18n
        if (element.hasAttribute('data-no-i18n')) {
            console.log(`⏭️ Ignoré (data-no-i18n): "${element.textContent.trim()}"`);
            continue;
        }
        
        const originalText = element.textContent.trim();
        console.log(`🔍 Vérification de: "${originalText}"`);
        
        // Ignorer les valeurs vides, numériques, ou déjà traduites
        if (!originalText || 
            /^\d+$/.test(originalText) || 
            /^#\d+$/.test(originalText) || 
            /^\d+,\d+$/.test(originalText) ||
            originalText === 'N/A' ||
            originalText === '0') {
            console.log(`⏭️ Ignoré (valeur numérique/vide): "${originalText}"`);
            continue;
        }
        
        // Vérifier si le texte doit être traduit
        if (shouldTranslate(originalText, targetLanguage)) {
            console.log(`✅ Doit être traduit: "${originalText}"`);
            try {
                const translatedText = await translateWithCache(originalText, targetLanguage);
                if (translatedText && translatedText.trim() !== '' && translatedText !== originalText) {
                    element.textContent = translatedText;
                    console.log(`✅ Traduit: "${originalText}" → "${translatedText}"`);
                } else {
                    console.log(`⚠️ Traduction invalide pour: "${originalText}"`);
                }
            } catch (error) {
                console.warn('Erreur lors de la traduction des valeurs:', error);
            }
        } else {
            console.log(`❌ Ne doit pas être traduit: "${originalText}"`);
        }
    }
    
    console.log('✅ Traduction des valeurs des informations générales terminée');
}

// Exposer la fonction globalement
window.translateGeneralInfoValues = translateGeneralInfoValues;



// Exposer les fonctions globalement
window.translateGeneralInfoValues = translateGeneralInfoValues;
window.translateDynamicContent = translateDynamicContent;
window.translateEntireSiteAutomatically = translateEntireSiteAutomatically;

// Fonction pour vérifier si un élément est déjà traduit
function isElementAlreadyTranslated(element, targetLanguage) {
    if (targetLanguage === 'fr') return false; // Toujours traduire en français pour les éléments dynamiques
    
    const originalText = element.getAttribute('data-original-text');
    if (originalText) {
        // Si l'élément a un attribut data-original-text, il a déjà été traduit
        return true;
    }
    
    return false;
}

// Fonction pour marquer un élément comme traduit
function markElementAsTranslated(element, originalText) {
    element.setAttribute('data-original-text', originalText);
    element.setAttribute('data-translated', 'true');
}

// Liste des pays (code ISO 2 lettres) pour inscription et profil — recherche utilisateur par code (ex. fr, de)
window.COUNTRY_LIST = [
    { code: 'fr', fr: 'France', en: 'France', de: 'Frankreich', es: 'Francia', it: 'Francia', ja: 'フランス' },
    { code: 'de', fr: 'Allemagne', en: 'Germany', de: 'Deutschland', es: 'Alemania', it: 'Germania', ja: 'ドイツ' },
    { code: 'gb', fr: 'Royaume-Uni', en: 'United Kingdom', de: 'Vereinigtes Königreich', es: 'Reino Unido', it: 'Regno Unito', ja: 'イギリス' },
    { code: 'us', fr: 'États-Unis', en: 'United States', de: 'Vereinigte Staaten', es: 'Estados Unidos', it: 'Stati Uniti', ja: 'アメリカ' },
    { code: 'es', fr: 'Espagne', en: 'Spain', de: 'Spanien', es: 'España', it: 'Spagna', ja: 'スペイン' },
    { code: 'it', fr: 'Italie', en: 'Italy', de: 'Italien', es: 'Italia', it: 'Italia', ja: 'イタリア' },
    { code: 'jp', fr: 'Japon', en: 'Japan', de: 'Japan', es: 'Japón', it: 'Giappone', ja: '日本' },
    { code: 'ca', fr: 'Canada', en: 'Canada', de: 'Kanada', es: 'Canadá', it: 'Canada', ja: 'カナダ' },
    { code: 'be', fr: 'Belgique', en: 'Belgium', de: 'Belgien', es: 'Bélgica', it: 'Belgio', ja: 'ベルギー' },
    { code: 'ch', fr: 'Suisse', en: 'Switzerland', de: 'Schweiz', es: 'Suiza', it: 'Svizzera', ja: 'スイス' },
    { code: 'nl', fr: 'Pays-Bas', en: 'Netherlands', de: 'Niederlande', es: 'Países Bajos', it: 'Paesi Bassi', ja: 'オランダ' },
    { code: 'pt', fr: 'Portugal', en: 'Portugal', de: 'Portugal', es: 'Portugal', it: 'Portogallo', ja: 'ポルトガル' },
    { code: 'br', fr: 'Brésil', en: 'Brazil', de: 'Brasilien', es: 'Brasil', it: 'Brasile', ja: 'ブラジル' },
    { code: 'mx', fr: 'Mexique', en: 'Mexico', de: 'Mexiko', es: 'México', it: 'Messico', ja: 'メキシコ' },
    { code: 'ar', fr: 'Argentine', en: 'Argentina', de: 'Argentinien', es: 'Argentina', it: 'Argentina', ja: 'アルゼンチン' },
    { code: 'ru', fr: 'Russie', en: 'Russia', de: 'Russland', es: 'Rusia', it: 'Russia', ja: 'ロシア' },
    { code: 'cn', fr: 'Chine', en: 'China', de: 'China', es: 'China', it: 'Cina', ja: '中国' },
    { code: 'kr', fr: 'Corée du Sud', en: 'South Korea', de: 'Südkorea', es: 'Corea del Sur', it: 'Corea del Sud', ja: '韓国' },
    { code: 'in', fr: 'Inde', en: 'India', de: 'Indien', es: 'India', it: 'India', ja: 'インド' },
    { code: 'au', fr: 'Australie', en: 'Australia', de: 'Australien', es: 'Australia', it: 'Australia', ja: 'オーストラリア' },
    { code: 'nz', fr: 'Nouvelle-Zélande', en: 'New Zealand', de: 'Neuseeland', es: 'Nueva Zelanda', it: 'Nuova Zelanda', ja: 'ニュージーランド' },
    { code: 'pl', fr: 'Pologne', en: 'Poland', de: 'Polen', es: 'Polonia', it: 'Polonia', ja: 'ポーランド' },
    { code: 'at', fr: 'Autriche', en: 'Austria', de: 'Österreich', es: 'Austria', it: 'Austria', ja: 'オーストリア' },
    { code: 'se', fr: 'Suède', en: 'Sweden', de: 'Schweden', es: 'Suecia', it: 'Svezia', ja: 'スウェーデン' },
    { code: 'no', fr: 'Norvège', en: 'Norway', de: 'Norwegen', es: 'Noruega', it: 'Norvegia', ja: 'ノルウェー' },
    { code: 'fi', fr: 'Finlande', en: 'Finland', de: 'Finnland', es: 'Finlandia', it: 'Finlandia', ja: 'フィンランド' },
    { code: 'dk', fr: 'Danemark', en: 'Denmark', de: 'Dänemark', es: 'Dinamarca', it: 'Danimarca', ja: 'デンマーク' },
    { code: 'ie', fr: 'Irlande', en: 'Ireland', de: 'Irland', es: 'Irlanda', it: 'Irlanda', ja: 'アイルランド' },
    { code: 'gr', fr: 'Grèce', en: 'Greece', de: 'Griechenland', es: 'Grecia', it: 'Grecia', ja: 'ギリシャ' },
    { code: 'tr', fr: 'Turquie', en: 'Turkey', de: 'Türkei', es: 'Turquía', it: 'Turchia', ja: 'トルコ' },
    { code: 'za', fr: 'Afrique du Sud', en: 'South Africa', de: 'Südafrika', es: 'Sudáfrica', it: 'Sudafrica', ja: '南アフリカ' },
    { code: 'eg', fr: 'Égypte', en: 'Egypt', de: 'Ägypten', es: 'Egipto', it: 'Egitto', ja: 'エジプト' },
    { code: 'ma', fr: 'Maroc', en: 'Morocco', de: 'Marokko', es: 'Marruecos', it: 'Marocco', ja: 'モロッコ' },
    { code: 'tn', fr: 'Tunisie', en: 'Tunisia', de: 'Tunesien', es: 'Túnez', it: 'Tunisia', ja: 'チュニジア' },
    { code: 'dz', fr: 'Algérie', en: 'Algeria', de: 'Algerien', es: 'Argelia', it: 'Algeria', ja: 'アルジェリア' },
    { code: 'th', fr: 'Thaïlande', en: 'Thailand', de: 'Thailand', es: 'Tailandia', it: 'Tailandia', ja: 'タイ' },
    { code: 'vn', fr: 'Viêt Nam', en: 'Vietnam', de: 'Vietnam', es: 'Vietnam', it: 'Vietnam', ja: 'ベトナム' },
    { code: 'id', fr: 'Indonésie', en: 'Indonesia', de: 'Indonesien', es: 'Indonesia', it: 'Indonesia', ja: 'インドネシア' },
    { code: 'my', fr: 'Malaisie', en: 'Malaysia', de: 'Malaysia', es: 'Malasia', it: 'Malesia', ja: 'マレーシア' },
    { code: 'ph', fr: 'Philippines', en: 'Philippines', de: 'Philippinen', es: 'Filipinas', it: 'Filippine', ja: 'フィリピン' },
    { code: 'sg', fr: 'Singapour', en: 'Singapore', de: 'Singapur', es: 'Singapur', it: 'Singapore', ja: 'シンガポール' },
    { code: 'lu', fr: 'Luxembourg', en: 'Luxembourg', de: 'Luxemburg', es: 'Luxemburgo', it: 'Lussemburgo', ja: 'ルクセンブルク' },
    { code: 'ro', fr: 'Roumanie', en: 'Romania', de: 'Rumänien', es: 'Rumania', it: 'Romania', ja: 'ルーマニア' },
    { code: 'hu', fr: 'Hongrie', en: 'Hungary', de: 'Ungarn', es: 'Hungría', it: 'Ungheria', ja: 'ハンガリー' },
    { code: 'cz', fr: 'République tchèque', en: 'Czech Republic', de: 'Tschechien', es: 'República Checa', it: 'Repubblica Ceca', ja: 'チェコ' },
    { code: 'ua', fr: 'Ukraine', en: 'Ukraine', de: 'Ukraine', es: 'Ucrania', it: 'Ucraina', ja: 'ウクライナ' },
    { code: 'il', fr: 'Israël', en: 'Israel', de: 'Israel', es: 'Israel', it: 'Israele', ja: 'イスラエル' },
    { code: 'sa', fr: 'Arabie saoudite', en: 'Saudi Arabia', de: 'Saudi-Arabien', es: 'Arabia Saudita', it: 'Arabia Saudita', ja: 'サウジアラビア' },
    { code: 'ae', fr: 'Émirats arabes unis', en: 'United Arab Emirates', de: 'Vereinigte Arabische Emirate', es: 'Emiratos Árabes Unidos', it: 'Emirati Arabi Uniti', ja: 'アラブ首長国連邦' },
    { code: 'ng', fr: 'Nigeria', en: 'Nigeria', de: 'Nigeria', es: 'Nigeria', it: 'Nigeria', ja: 'ナイジェリア' },
    { code: 'ke', fr: 'Kenya', en: 'Kenya', de: 'Kenia', es: 'Kenia', it: 'Kenya', ja: 'ケニア' },
    { code: 'cl', fr: 'Chili', en: 'Chile', de: 'Chile', es: 'Chile', it: 'Cile', ja: 'チリ' },
    { code: 'co', fr: 'Colombie', en: 'Colombia', de: 'Kolumbien', es: 'Colombia', it: 'Colombia', ja: 'コロンビア' },
    { code: 'pe', fr: 'Pérou', en: 'Peru', de: 'Peru', es: 'Perú', it: 'Perù', ja: 'ペルー' },
    { code: 've', fr: 'Venezuela', en: 'Venezuela', de: 'Venezuela', es: 'Venezuela', it: 'Venezuela', ja: 'ベネズエラ' },
    { code: 'ec', fr: 'Équateur', en: 'Ecuador', de: 'Ecuador', es: 'Ecuador', it: 'Ecuador', ja: 'エクアドル' },
    { code: 'pk', fr: 'Pakistan', en: 'Pakistan', de: 'Pakistan', es: 'Pakistán', it: 'Pakistan', ja: 'パキスタン' },
    { code: 'bd', fr: 'Bangladesh', en: 'Bangladesh', de: 'Bangladesch', es: 'Bangladesh', it: 'Bangladesh', ja: 'バングラデシュ' },
    { code: 'other', fr: 'Autre', en: 'Other', de: 'Andere', es: 'Otro', it: 'Altro', ja: 'その他' }
];

window.getCountryName = function(code, lang) {
    if (!code) return '';
    var c = (code || '').toString().toLowerCase();
    var list = window.COUNTRY_LIST || [];
    var row = list.find(function(r) { return r.code === c; });
    if (!row) return code.toUpperCase();
    var l = (lang || localStorage.getItem('mangaWatchLanguage') || 'fr').toLowerCase();
    return row[l] || row.fr || row.en || code.toUpperCase();
};

