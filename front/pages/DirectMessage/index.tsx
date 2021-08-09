import ChatBox from '@components/ChatBox';
import ChatList from '@components/ChatList';
import { Container, Header, DragOver } from '@pages/Channel/styles';
import { IDM } from '@typings/db';
import fetcher from '@utils/fetcher';
import makeSection from '@utils/makeSection';
import React, { useCallback, useRef, useEffect, useState } from 'react';
import gravatar from 'gravatar';
import { useParams } from 'react-router';
import useSWR, { useSWRInfinite } from 'swr';
import useInput from '@hooks/useInput';
import useSocket from '@hooks/useSocket';
import axios from 'axios';
import Scrollbars from 'react-custom-scrollbars';

const DirectMessage = () => {
  const { workspace, id } = useParams<{ workspace: string; id: string }>();
  const { data: userData } = useSWR(`/api/workspaces/${workspace}/users/${id}`, fetcher);
  const { data: myData } = useSWR('/api/users', fetcher);
  const [chat, onChangeChat, setChat] = useInput('');
  //채팅 받아오는 API
  const {
    data: chatData,
    mutate: mutateChat,
    revalidate,
    setSize, // index는 페이지수, setSize는 페이지수를 바꿔줌
  } = useSWRInfinite<IDM[]>(
    (index) => `/api/workspaces/${workspace}/dms/${id}/chats?perPage=20&page=${index + 1}`,
    fetcher,
  );
  const [socket] = useSocket(workspace);
  // useSWRInfinite는 2차원배열을 지원해준다 1차원배열[{},{},{}] / 2차원배열 [[{}, {}], [{},{}]]

  // isEmpty와 isReachingEnd라는 변수를 만들어서 인피니트스크롤링할때 사용
  // 데이터40개 20+20 가져오고 +0 isEmpty는 true isReachingEnd도 true
  // 데이터45개 20+20 가져오고 +5 isEmpty는 false isReachingEnd는 true
  const isEmpty = chatData?.[0]?.length === 0;
  const isReachingEnd = isEmpty || (chatData && chatData[chatData.length - 1]?.length < 20) || false; // 기본값 false
  const scrollbarRef = useRef<Scrollbars>(null);
  const [dragOver, setDragOver] = useState(false);
  //채팅 보내는 API
  const onSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      console.log(chat);
      if (chat?.trim() && chatData) {
        // optimistic UI 화면에 먼저 반영 서버에 가지않기때문에 임의로 성공한거처럼 데이터
        mutateChat((prevChatData) => {
          const savedChat = chat;
          prevChatData?.[0].unshift({
            id: (chatData[0][0]?.id || 0) + 1,
            content: savedChat,
            SenderId: myData.id,
            Sender: myData,
            ReceiverId: userData.id,
            Receiver: userData,
            createdAt: new Date(),
          });
          return prevChatData;
        }, false) // shouldRevalidate가 false여야함
          .then(() => {
            setChat(''); // 채팅 보내고 공백으로
            scrollbarRef.current?.scrollToBottom(); // 채팅 보냈을때 가장 밑으로
          });
        axios
          .post(`/api/workspaces/${workspace}/dms/${id}/chats`, {
            content: chat,
          })
          .then(() => {
            revalidate(); // 바로 받아오게끔
          })
          .catch(console.error);
      }
    },
    [chat, chatData, myData, userData, workspace, id],
  );

  const onMessage = useCallback((data: IDM) => {
    // id는 상대방 아이디
    if (data.SenderId === Number(id) && myData.id !== Number(id)) {
      mutateChat((chatData) => {
        chatData?.[0].unshift(data);
        return chatData;
      }, false).then(() => {
        if (scrollbarRef.current) {
          if (
            scrollbarRef.current.getScrollHeight() <
            scrollbarRef.current.getClientHeight() + scrollbarRef.current.getScrollTop() + 150
          ) {
            console.log('scrollToBottom!', scrollbarRef.current?.getValues());
            setTimeout(() => {
              scrollbarRef.current?.scrollToBottom();
            }, 50);
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    socket?.on('dm', onMessage);
    return () => {
      socket?.off('dm', onMessage);
    };
  }, [socket, onMessage]);

  // 로딩 시 스크롤바 제일 아래로
  useEffect(() => {
    if (chatData?.length === 1) {
      // 채팅데이터가 있어서 불러온 경우
      setTimeout(() => {
        scrollbarRef.current?.scrollToBottom(); // 스크롤바 가장 밑으로
      }, 100);
    }
  }, [chatData]);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      console.log(e);
      const formData = new FormData();
      if (e.dataTransfer.items) {
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          if (e.dataTransfer.items[i].kind === 'file') {
            const file = e.dataTransfer.items[i].getAsFile();
            console.log('... file[' + i + '].name = ' + file.name);
            formData.append('image', file);
          }
        }
      } else {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          console.log('... file[' + i + '].name = ' + e.dataTransfer.files[i].name);
          formData.append('image', e.dataTransfer.files[i]);
        }
      }
      axios.post(`/api/workspaces/${workspace}/dms/${id}/images`, formData).then(() => {
        setDragOver(false);
        revalidate();
      });
    },
    [revalidate, workspace, id],
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    console.log(e);
    setDragOver(true);
  }, []);

  if (!userData || !myData) {
    return null;
  }

  const chatSections = makeSection(chatData ? chatData.flat().reverse() : []); // 2차원배열을 1차열배열로 바꿔주고 reverse

  return (
    <Container onDrop={onDrop} onDragOver={onDragOver}>
      <Header>
        <img src={gravatar.url(userData.email, { s: '24px', d: 'retro' })} alt={userData.nickname} />
      </Header>
      <ChatList chatSections={chatSections} ref={scrollbarRef} setSize={setSize} isReachingEnd={isReachingEnd} />
      <ChatBox chat={chat} onChangeChat={onChangeChat} onSubmitForm={onSubmitForm} />
      {dragOver && <DragOver>업로드!</DragOver>}
    </Container>
  );
};

export default DirectMessage;
