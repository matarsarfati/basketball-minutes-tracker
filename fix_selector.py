with open('src/screens/TeamSelector.jsx', 'r') as f:
    content = f.read()

content = content.replace(
"""    const { setActiveTeamId } = useTeam();

    const handleSelectTeam = (teamId) => {""",
"""    const { activeTeamId, setActiveTeamId } = useTeam();

    useEffect(() => {
        if (activeTeamId) {
            navigate('/dashboard');
        }
    }, [activeTeamId, navigate]);

    const handleSelectTeam = (teamId) => {""")

with open('src/screens/TeamSelector.jsx', 'w') as f:
    f.write(content)
