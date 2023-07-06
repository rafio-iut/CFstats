import { getUpcomingContests } from '../api';
import { Contest } from '../api/interfaces';

import {
  Button,
  ButtonGroup,
  Link,
  Table,
  Tbody,
  Td,
  Tr,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';

const ContestTable = () => {
  const [mode, setMode] = useState<'ONGOING' | 'TODAY' | 'THIS WEEK'>(
    'ONGOING'
  );
  const [loading, setLoading] = useState(true);
  const [contests, setContests] = useState<Contest[]>([]);

  useEffect(() => {
    const fetchContests = async () => {
      try {
        setLoading(true);
        const upcomingContests = await getUpcomingContests(mode);
        setContests(upcomingContests);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };

    fetchContests();
  }, [mode]);

  const handleModeChange = (
    selectedMode: 'ONGOING' | 'TODAY' | 'THIS WEEK'
  ) => {
    setMode(selectedMode);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <>
      <ButtonGroup mb={4}>
        <Button
          colorScheme={mode === 'ONGOING' ? 'teal' : 'gray'}
          onClick={() => handleModeChange('ONGOING')}
        >
          Ongoing
        </Button>
        <Button
          colorScheme={mode === 'TODAY' ? 'teal' : 'gray'}
          onClick={() => handleModeChange('TODAY')}
        >
          Today
        </Button>
        <Button
          colorScheme={mode === 'THIS WEEK' ? 'teal' : 'gray'}
          onClick={() => handleModeChange('THIS WEEK')}
        >
          This Week
        </Button>
      </ButtonGroup>

      <Table variant="simple">
        <Tbody>
          {contests.map((contest) => (
            <Tr key={contest.id}>
              <Td>
                <Link href={`${contest.id}`} isExternal color="blue.500">
                  {contest.name}
                </Link>
              </Td>
              <Td>
                {contest.startTimeSeconds
                  ? new Date(contest.startTimeSeconds * 1000).toLocaleString()
                  : 'N/A'}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </>
  );
};

export default ContestTable;
