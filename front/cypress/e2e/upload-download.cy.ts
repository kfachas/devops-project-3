describe('Parcours critique — inscription, upload, téléchargement, historique', () => {
  it('inscrit un utilisateur, téléverse un fichier, le télécharge via le lien, et le voit dans son espace', () => {
    const email = `cypress-${Date.now()}@datashare.app`;
    const password = 'motdepasse123';

    cy.visit('/inscription');
    cy.contains('label', 'Email').find('input').type(email);
    cy.contains('label', 'Mot de passe').find('input').type(password);
    cy.contains('label', 'Vérification du mot de passe').find('input').type(password);
    cy.contains('button', 'Créer mon compte').click();
    cy.location('pathname').should('eq', '/mon-espace');

    cy.visit('/');
    cy.get('input[type=file]').selectFile('cypress/fixtures/sample.txt', { force: true });
    cy.contains('button', 'Téléverser').click();
    cy.contains('Félicitations, ton fichier sera conservé chez nous !').should('be.visible');

    cy.get('.ds-dl-link')
      .invoke('text')
      .then((downloadUrl) => {
        const token = downloadUrl.trim().split('/d/')[1];
        expect(token).to.be.a('string').and.not.be.empty;

        cy.visit(`/d/${token}`);
        cy.contains('sample.txt').should('be.visible');

        cy.intercept('GET', '/api/files/*/download').as('download');
        cy.contains('button', 'Télécharger').click();
        cy.wait('@download').its('response.statusCode').should('eq', 200);
      });

    cy.visit('/mon-espace');
    cy.contains('sample.txt').should('be.visible');
  });
});
