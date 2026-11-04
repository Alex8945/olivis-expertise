# Guide simple : connecter Olivis Expertise à Supabase

L'URL de ton projet et sa clé publique sont déjà renseignées dans `supabase-config.js`. Tu n'as pas à refaire cette étape. Il reste à créer la table dans Supabase, préparer le compte du personnel et ouvrir le site.

## A. Créer la table des réclamations

1. Connecte-toi à [Supabase](https://supabase.com/) et ouvre ton projet.
2. Dans le menu à gauche, clique sur **SQL Editor**.
3. Clique sur **New query**.
4. Sur ton ordinateur, ouvre le fichier `supabase.sql` qui se trouve dans le dossier du projet. Sélectionne tout son contenu et copie-le.
5. Colle le texte dans la grande zone de l'éditeur SQL de Supabase.
6. Clique sur **Run**. Supabase doit indiquer que la requête s'est exécutée sans erreur. Cette action crée la table et les règles qui protègent les dossiers. Ne colle pas le SQL dans le champ de recherche des tables.

## B. Créer le compte qui gérera les dossiers

7. Dans le menu de Supabase, ouvre **Authentication**, puis **Users**.
8. Clique sur **Add user** (ou **Invite user**) et crée un compte avec ton adresse e-mail. Si tu choisis l'invitation, ouvre le message reçu et suis le lien pour définir le mot de passe.
9. Dans **Authentication → Settings** ou **Providers → Email**, désactive **Allow new users to sign up** / les inscriptions publiques. Cela évite que les visiteurs créent eux-mêmes un compte du personnel. Le compte créé à l'étape précédente reste utilisable.

## C. Ouvrir le site et vérifier

10. Ouvre `index.html` avec un serveur web local, ou mets le dossier sur un hébergement HTTPS. Ne double-clique pas simplement sur le fichier si le navigateur montre une page vide ou une erreur.
11. Sur le site, va dans **Tableau de bord**, saisis l'adresse e-mail et le mot de passe du compte créé à l'étape 8, puis clique sur **Se connecter**.
12. Pour tester, déconnecte-toi, ouvre **Déposer une plainte**, envoie une demande de test, puis retrouve-la avec sa référence dans **Suivre un dossier**. Reconnecte-toi pour la voir dans le tableau de bord.

## À retenir

- Tu peux trouver l'URL et la clé publique dans **Project Settings → API**. Elles sont déjà configurées dans `supabase-config.js`.
- La clé publishable/anon peut être utilisée dans le navigateur. Ne mets jamais une clé **service_role**, un mot de passe ou un secret dans ce fichier.
- Les visiteurs peuvent déposer une réclamation et consulter le statut avec leur référence. Seul un compte connecté peut voir les coordonnées et la description complète.
- Les données de démonstration de l'ancienne version ne sont pas importées.
