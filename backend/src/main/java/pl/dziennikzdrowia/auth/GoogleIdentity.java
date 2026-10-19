package pl.dziennikzdrowia.auth;

/**
 * Dane konta Google odczytane ze zweryfikowanego ID tokenu.
 *
 * @param sub stały identyfikator konta Google (nie zmienia się, w przeciwieństwie do e-maila)
 */
public record GoogleIdentity(String sub, String email, String name, String pictureUrl) {
}
