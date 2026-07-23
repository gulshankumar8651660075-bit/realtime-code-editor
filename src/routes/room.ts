import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateJWT, AuthRequest } from '../middleware/auth';

const router = Router();

// Default templates for initial snippets
const BOILERPLATE: Record<string, string> = {
  javascript: `// Real-Time Collaborative JS Workspace
console.log("Hello, World!");

// Try creating an array and mapping it!
const items = [1, 2, 3, 4, 5];
const doubled = items.map(x => x * 2);
console.log("Doubled values:", doubled);
`,
  python: `# Real-Time Collaborative Python Workspace
print("Hello, World!")

# Try writing a function
def greet(name):
    return f"Welcome to the sandbox, {name}!"

print(greet("Developer"))
`,
  cpp: `// Real-Time Collaborative C++ Workspace
#include <iostream>
#include <vector>
#include <string>

int main() {
    std::cout << "Hello, World!" << std::endl;
    
    std::vector<std::string> options = {"Real-time", "Collaborative", "Docker Sandbox"};
    for (const auto& opt : options) {
        std::cout << " - " << opt << std::endl;
    }
    return 0;
}
`,
  go: `// Real-Time Collaborative Go Workspace
package main

import (
	"fmt"
)

func main() {
	fmt.Println("Hello, World!")
	
	languages := []string{"Go", "Python", "JavaScript", "C++"}
	fmt.Println("Supported compilers:")
	for idx, lang := range languages {
		fmt.Printf("%d. %s\\n", idx+1, lang)
	}
}
`,
};

// Create a Room
router.post('/create', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { room_name, language } = req.body;
  const owner_id = req.user?.id;

  if (!room_name) {
    return res.status(400).json({ error: 'Room name is required' });
  }

  const selectedLanguage = language || 'javascript';
  const boilerplateContent = BOILERPLATE[selectedLanguage] || '// Write your code here';

  if (!owner_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const room = await prisma.room.create({
      data: {
        room_name,
        owner_id,
        snippets: {
          create: {
            content: boilerplateContent,
            language: selectedLanguage,
          },
        },
      },
      include: {
        snippets: true,
      },
    });

    return res.status(201).json({ room });
  } catch (err: any) {
    console.error('Room creation error:', err);
    return res.status(500).json({ error: 'Server error during room creation' });
  }
});

// List User's Rooms
router.get('/list', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const owner_id = req.user?.id;

  if (!owner_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const rooms = await prisma.room.findMany({
      where: { owner_id },
      include: {
        snippets: {
          orderBy: { updated_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return res.json({ rooms });
  } catch (err: any) {
    console.error('List rooms error:', err);
    return res.status(500).json({ error: 'Server error fetching rooms' });
  }
});

// Get Room Details (and latest snippet)
router.get('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const room = await prisma.room.findUnique({
      where: { id: id as string },
      include: {
        owner: {
          select: { id: true, username: true, email: true },
        },
        snippets: {
          orderBy: { updated_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    return res.json({ room });
  } catch (err: any) {
    console.error('Fetch room error:', err);
    return res.status(500).json({ error: 'Server error fetching room details' });
  }
});

// Delete a Room
router.delete('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const owner_id = req.user?.id;

  if (!owner_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const room = await prisma.room.findUnique({
      where: { id: id as string },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.owner_id !== owner_id) {
      return res.status(403).json({ error: 'Forbidden: You are not the owner of this room' });
    }

    await prisma.room.delete({
      where: { id: id as string },
    });

    return res.json({ message: 'Room deleted successfully' });
  } catch (err: any) {
    console.error('Delete room error:', err);
    return res.status(500).json({ error: 'Server error deleting room' });
  }
});

export default router;
