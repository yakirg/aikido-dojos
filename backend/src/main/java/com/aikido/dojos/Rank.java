package com.aikido.dojos;

public enum Rank {
    ROKYU("6th kyu", "rokyu", "kyu", "Green Belt"),
    GOKYU("5th kyu", "gokyu", "kyu", "Green Belt"),
    YONKYU("4th kyu", "yonkyu", "kyu", "Blue Belt"),
    SANKYU("3rd kyu", "sankyu", "kyu", "Blue Belt"),
    NIKYU("2nd kyu", "nikyu", "kyu", "Brown Belt, Hakama"),
    IKKYU("1st kyu", "ikkyu", "kyu", "Brown Belt"),
    SHODAN("1st dan", "shodan", "dan", "Black Belt"),
    NIDAN("2nd dan", "nidan", "dan", "Fuku-Shidoin (assistant instructor)"),
    SANDAN("3rd dan", "sandan", "dan", "Fuku-Shidoin (assistant instructor)"),
    YODAN("4th dan", "yodan", "dan", "Shidoin (instructor)"),
    GODAN("5th dan", "godan", "dan", "Shidoin (instructor)"),
    ROKUDAN("6th dan", "rokudan", "dan", "Shidoin (instructor)"),
    SHICHIDAN("7th dan", "shichidan", "dan", "Shihan (master instructor)"),
    HACHIDAN("8th dan", "hachidan", "dan", "Higher");

    private final String label;
    private final String japanese;
    private final String category;
    private final String title;

    Rank(String label, String japanese, String category, String title) {
        this.label = label;
        this.japanese = japanese;
        this.category = category;
        this.title = title;
    }

    public record Info(String code, String label, String japanese, String category, String title) {}

    public Info info() {
        return new Info(name(), label, japanese, category, title);
    }
}
