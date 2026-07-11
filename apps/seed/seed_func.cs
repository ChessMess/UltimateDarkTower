public SeedParser()
{
    _random = new Random(); // This random object ends up creating the seed. So no seeding the seeder.

    _characterValues = new Dictionary<char, int>(34);
    _characterValues['a'] = 0;
    _characterValues['1'] = 1;
    _characterValues['2'] = 2;
    _characterValues['3'] = 3;
    _characterValues['4'] = 4;
    _characterValues['5'] = 5;
    _characterValues['6'] = 6;
    _characterValues['7'] = 7;
    _characterValues['8'] = 8;
    _characterValues['9'] = 9;
    _characterValues['b'] = 10;
    _characterValues['c'] = 11;
    _characterValues['d'] = 12;
    _characterValues['e'] = 13;
    _characterValues['f'] = 14;
    _characterValues['g'] = 15;
    _characterValues['h'] = 16;
    _characterValues['i'] = 17;
    _characterValues['j'] = 18;
    _characterValues['k'] = 19;
    _characterValues['l'] = 20;
    _characterValues['m'] = 21;
    _characterValues['n'] = 22;
    _characterValues['p'] = 23;
    _characterValues['q'] = 24;
    _characterValues['r'] = 25;
    _characterValues['s'] = 26;
    _characterValues['t'] = 27;
    _characterValues['u'] = 28;
    _characterValues['v'] = 29;
    _characterValues['w'] = 30;
    _characterValues['x'] = 31;
    _characterValues['y'] = 32;
    _characterValues['z'] = 33;

    _intValues = new Dictionary<int, char>(34);
    foreach (KeyValuePair<char, int> keyValuePair in _characterValues)
    {
        _intValues[keyValuePair.Value] = keyValuePair.Key;
    }
} 

// We create SeedBank from the functions below. Then when the game is initialized we do the following:
// _random = new Random(game.SeedBank.InitializationSeed);
Random random = new Random(seedBank.QuestSeed);

/// <summary>
/// Container for the game's seed.
/// </summary>
public class SeedBank
{
    public readonly int InitializationSeed;
    public readonly int QuestSeed;
    public readonly string SeedString;

    public SeedBank(int seed, string seedString)
    {
        InitializationSeed = seed;
        QuestSeed = seed - 1;
        SeedString = seedString;
    }
}

public Seedput ConvertSeedToGame(string seed)
{
    Seedput seedput = new Seedput(seed);

    string setupString = seed.Substring(0, 6);
    seed = seed.Substring(6);

    char[] seedChars = seed.ToCharArray();
    char[] setupChars = setupString.ToCharArray();

    int[] setup = { 0, 0, 0, 0, 0, 0 };

    for (int i = 0; i < 6; i++)
    {
        char c = setupChars[i];

        if (_characterValues.TryGetValue(c, out int value))
        {
            setup[i] = value;
        }
    }

    int length = seedChars.Length;
    int[] numbers = new int[12];
    for (int i = 0; i < length; i++)
    {
        char c = seedChars[i];

        if (_characterValues.TryGetValue(c, out int value))
        {
            numbers[i] = value;
        }
        else
        {
            numbers[i] = i;
        }
    }

    int sum = 0;

    for (int i = 0; i < numbers.Length; i++)
    {
        sum += numbers[i] * Mathf.RoundToInt(Mathf.Pow(BaseCase, i));
    }

    seedput.RngValue = sum;

    FoeType[] foeTypes = new FoeType[3];
    byte foeIntA = (byte) setup[0];
    byte foeIntB = (byte) setup[1];

    byte tier1 = (byte) (foeIntA & 0b0_0011);
    switch (tier1)
    {
        case 0b00:
            foeTypes[0] = FoeType.Brigands;
            break;
        case 0b01:
            foeTypes[0] = FoeType.Oreks;
            break;
        case 0b10:
            foeTypes[0] = FoeType.ShadowWolves;
            break;
        case 0b11:
            foeTypes[0] = FoeType.SpineFiends;
            break;
    }

    byte tier2 = (byte) ((foeIntA & 0b0_1100) >> 2);
    switch (tier2)
    {
        case 0b00:
            foeTypes[1] = FoeType.FrostTrolls;
            break;
        case 0b01:
            foeTypes[1] = FoeType.ClanOfNeuri;
            break;
        case 0b10:
            foeTypes[1] = FoeType.Lemures;
            break;
        case 0b11:
            foeTypes[1] = FoeType.WidowmadeSpiders;
            break;
    }

    byte tier3 = (byte) (((foeIntA & 0b1_0000) >> 4) | ((foeIntB & 0b1_0000) >> 3));
    switch (tier3)
    {
        case 0b00:
            foeTypes[2] = FoeType.Dragons;
            break;
        case 0b01:
            foeTypes[2] = FoeType.Mormos;
            break;
        case 0b10:
            foeTypes[2] = FoeType.Striga;
            break;
        case 0b11:
            foeTypes[2] = FoeType.Titans;
            break;
    }

    seedput.FoeTypes = foeTypes;

    byte adversary = (byte) (foeIntB & 0b0_1111);
    switch (adversary)
    {
        case 0b0000:
            seedput.Adversary = FoeType.Ashstrider;
            break;
        case 0b0001:
            seedput.Adversary = FoeType.BaneOfOmens;
            break;
        case 0b0010:
            seedput.Adversary = FoeType.EmpressOfShades;
            break;
        case 0b0011:
            seedput.Adversary = FoeType.GazeEternal;
            break;
        case 0b0100:
            seedput.Adversary = FoeType.Gravemaw;
            break;
        case 0b0101:
            seedput.Adversary = FoeType.IsaTheExile;
            break;
        case 0b0110:
            seedput.Adversary = FoeType.LingeringRot;
            break;
        case 0b0111:
            seedput.Adversary = FoeType.UtukKu;
            break;
    }

    byte ally = (byte) setup[2];

    switch (ally)
    {
        case 0b0000:
            seedput.Ally = CompanionType.Gleb;
            break;
        case 0b0001:
            seedput.Ally = CompanionType.Grigor;
            break;
        case 0b0010:
            seedput.Ally = CompanionType.Hakan;
            break;
        case 0b0011:
            seedput.Ally = CompanionType.Letha;
            break;
        case 0b0100:
            seedput.Ally = CompanionType.Miras;
            break;
        case 0b0101:
            seedput.Ally = CompanionType.Nimet;
            break;
        case 0b0110:
            seedput.Ally = CompanionType.Tomas;
            break;
        case 0b0111:
            seedput.Ally = CompanionType.Vasa;
            break;
        case 0b1000:
            seedput.Ally = CompanionType.Yana;
            break;
        case 0b1001:
            seedput.Ally = CompanionType.Zaida;
            break;
    }

    byte extra = (byte) setup[3];
    byte difficulty = (byte) (extra & 0b0_0001);
    byte source = (byte) ((extra & 0b0_1000) >> 2);
    byte expansions = (byte) ((extra & 0b0_0110) >> 1);

    switch (difficulty)
    {
        case 0b00:
            seedput.Difficulty = DifficultyType.Heroic;
            break;
        case 0b01:
            seedput.Difficulty = DifficultyType.Gritty;
            break;
    }

    switch (source)
    {
        case 0b00:
            seedput.Source = GameType.Core;
            break;
        case 0b10:
            seedput.Source = GameType.Competitive;
            break;
    }

    List<ExpansionType> expansionTypes = new List<ExpansionType>(2); // In case we get more expansions later that need to be stored in other spots

    switch (expansions)
    {
        case 0b000:
            // No expansions
            break;
        case 0b001:
            expansionTypes.Add(ExpansionType.Monuments);
            break;
        case 0b010:
            expansionTypes.Add(ExpansionType.Alliances);

            break;
        case 0b011:
            expansionTypes.Add(ExpansionType.Alliances);
            expansionTypes.Add(ExpansionType.Monuments);
            break;
    }

    seedput.Expansions = expansionTypes.ToArray();

    byte playerCount = (byte) setup[5];

    switch (playerCount)
    {
        case 0b00:
            seedput.PlayerCount = 1;
            break;
        case 0b01:
            seedput.PlayerCount = 2;
            break;
        case 0b10:
            seedput.PlayerCount = 3;
            break;
        case 0b11:
            seedput.PlayerCount = 4;
            break;
    }

    // Debug.Log($"Extra: {Convert.ToString(extra, toBase: 2),5}");

    return seedput;
}

public string CreateSeed(GameType source, int playerCount, FoeType adversary, CompanionType companion, DifficultyType difficulty, FoeType[] foeTypes, ExpansionType[] expansions,
    out int rngValue)
{
    byte foeByteA = 0b0_0000;
    byte foeByteB = 0b0_0000;

    switch (foeTypes[0])
    {
        case FoeType.Brigands:
            foeByteA = 0b0_0000;
            break;
        case FoeType.Oreks:
            foeByteA = 0b0_0001;
            break;
        case FoeType.ShadowWolves:
            foeByteA = 0b0_0010;
            break;
        case FoeType.SpineFiends:
            foeByteA = 0b0_0011;
            break;
    }

    switch (foeTypes[1])
    {
        case FoeType.FrostTrolls:
            foeByteA = (byte) (foeByteA | 0b0_0000);
            break;
        case FoeType.ClanOfNeuri:
            foeByteA = (byte) (foeByteA | 0b0_0100);
            break;
        case FoeType.Lemures:
            foeByteA = (byte) (foeByteA | 0b0_1000);
            break;
        case FoeType.WidowmadeSpiders:
            foeByteA = (byte) (foeByteA | 0b0_1100);
            break;
    }

    switch (foeTypes[2])
    {
        case FoeType.Dragons:
            foeByteA = (byte) (foeByteA | 0b0_0000);
            foeByteB = (byte) (foeByteB | 0b0_0000);
            break;
        case FoeType.Mormos:
            foeByteA = (byte) (foeByteA | 0b1_0000);
            foeByteB = (byte) (foeByteB | 0b0_0000);
            break;
        case FoeType.Striga:
            foeByteA = (byte) (foeByteA | 0b0_0000);
            foeByteB = (byte) (foeByteB | 0b1_0000);
            break;
        case FoeType.Titans:
            foeByteA = (byte) (foeByteA | 0b1_0000);
            foeByteB = (byte) (foeByteB | 0b1_0000);
            break;
    }

    switch (adversary)
    {
        case FoeType.Ashstrider:
            foeByteB = (byte) (foeByteB | 0b0_0000);
            break;
        case FoeType.BaneOfOmens:
            foeByteB = (byte) (foeByteB | 0b0_0001);
            break;
        case FoeType.EmpressOfShades:
            foeByteB = (byte) (foeByteB | 0b0_0010);
            break;
        case FoeType.GazeEternal:
            foeByteB = (byte) (foeByteB | 0b0_0011);
            break;
        case FoeType.Gravemaw:
            foeByteB = (byte) (foeByteB | 0b0_0100);
            break;
        case FoeType.IsaTheExile:
            foeByteB = (byte) (foeByteB | 0b0_0101);
            break;
        case FoeType.LingeringRot:
            foeByteB = (byte) (foeByteB | 0b0_0110);
            break;
        case FoeType.UtukKu:
            foeByteB = (byte) (foeByteB | 0b0_0111);
            break;
    }

    char foeValueA = _intValues[foeByteA];
    char foeValueB = _intValues[foeByteB];

    byte allyByte = 0b0_0000;

    switch (companion)
    {
        case CompanionType.Gleb:
            allyByte = 0b0_0000;
            break;
        case CompanionType.Grigor:
            allyByte = 0b0_0001;
            break;
        case CompanionType.Hakan:
            allyByte = 0b0_0010;
            break;
        case CompanionType.Letha:
            allyByte = 0b0_0011;
            break;
        case CompanionType.Miras:
            allyByte = 0b0_0100;
            break;
        case CompanionType.Nimet:
            allyByte = 0b0_0101;
            break;
        case CompanionType.Tomas:
            allyByte = 0b0_0110;
            break;
        case CompanionType.Vasa:
            allyByte = 0b0_0111;
            break;
        case CompanionType.Yana:
            allyByte = 0b0_1000;
            break;
        case CompanionType.Zaida:
            allyByte = 0b0_1001;
            break;
    }

    char allyValue = _intValues[allyByte];

    byte extraByte = 0b0_0000;

    if (difficulty == DifficultyType.Gritty)
    {
        extraByte = (byte) (extraByte | 0b0_0001);
    }

    switch (source)
    {
        case GameType.Competitive:
            extraByte = (byte) (extraByte | 0b0_1000);
            break;
        case GameType.None:
        case GameType.Core:
        default:
            extraByte = (byte) (extraByte | 0b0_0000);
            break;
    }

    foreach (ExpansionType expansion in expansions)
    {
        switch (expansion)
        {
            case ExpansionType.Alliances:
                extraByte = (byte) (extraByte | 0b0_0100);
                break;
            case ExpansionType.Monuments:
                extraByte = (byte) (extraByte | 0b0_0010);
                break;
            case ExpansionType.None:
            default:
                continue;
        }
    }

    char extraValue = _intValues[extraByte];

    byte versionByte = 0b0_0000;
    char versionValue = _intValues[versionByte];

    byte ancillaryByte = 0b0_0000;

    switch (playerCount)
    {
        case 1:
            ancillaryByte = 0b0_0000;
            break;
        case 2:
            ancillaryByte = 0b0_0001;
            break;
        case 3:
            ancillaryByte = 0b0_0010;
            break;
        case 4:
            ancillaryByte = 0b0_0011;
            break;
    }

    char ancillaryValue = _intValues[ancillaryByte];

    int sum = 0;

    string seed = $"{foeValueA}{foeValueB}{allyValue}{extraValue}{versionValue}{ancillaryValue}";

    for (int i = 0; i < RandomSeedLength; i++)
    {
        int value = _random.Next(0, 34);
        char c = _intValues[value];
        seed += c;

        sum += value * Mathf.RoundToInt(Mathf.Pow(34, i));
    }

    rngValue = sum;
    seed = seed.ToUpper();

    return seed;
}